const axios = require("axios");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { OpenAIEmbeddings, ChatOpenAI } = require("@langchain/openai");
const { saveTextChunks } = require("../../util/save-text-chunks");
const { processPodcastURL } = require("../../util/extract-transcripts-from-podcast");
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Used to help with parsing content from websites
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0
});

// Initialize the OpenAI embedding model
const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-ada-002"
});

async function getContentChunks(contentArray) {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  let chunks = await splitter.createDocuments(contentArray);

  // Generate embeddings for each of the text chunks
  for(let i = 0; i < chunks.length; i++) {
    const embedding = await embeddings.embedQuery(chunks[i].pageContent);
    chunks[i].embedding = embedding;
  }
  
  return chunks;
}

// Processors for different URL types
async function processTextURL(url) {
  try {
    const { data } = await axios.get(url);
    const text = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const content = await extractOrSummarizeContent(text);

    return [content];
  } catch (error) {
    console.error(`Error fetching the URL: ${error}`);
  }
}

// Helper function to extract or summarize content using OpenAI
async function extractOrSummarizeContent(text) {
  const prompt = `
    Here is the content of a webpage:
    ${text}
    
    Instructions:
    - If there is a blog post within this content, extract and return the main text of the blog post.
    - If there is no blog post, summarize the most important information on the page.
  `;

  try {
    const response = await llm.invoke([{ role: "user", content: prompt }]);

    return response.content;
  } catch (error) {
    console.error(`Error calling OpenAI model: ${error}`);
  }
}

// Goes through each URL and extracts text and chunks for the content associated with the URL
async function processUrls(bundleId, urls) {
  let urlToChunks = {};
  for(let i = 0; i < urls.length; i++) {
    let url = urls[i];
    console.log(i + " " + url);
    try {
      let content;
      if (url.includes('podcasts.apple.com')) {
        content = await processPodcastURL(bundleId, url);
      } else {
        content = await processTextURL(url);
      }

      const chunks = await getContentChunks(content);
      
      // Save the chunks associated with this url
      urlToChunks[url] = chunks;

    } catch (error) {
      console.error(`Error processing URL: ${url}`, error);
      return { url, error: error.message };
    }
  }

  return urlToChunks;
}

// Extracts text from all provided URLs and writes chunked text to a Kafka topic
async function processResearchBundle(bundleId, urls) {
  let urlToChunks = await processUrls(bundleId, urls);

  for (const url in urlToChunks) {
    let documents = urlToChunks[url];
    let textChunks = [];

    // Save each chunk from the URL and associate with the bundle ID
    for(let i = 0; i < documents.length; i++) {
      let text = documents[i].pageContent;
  
      textChunks.push({
        bundleId: bundleId,
        url: url,
        text: text,
        embedding: documents[i].embedding
      });
    }

    saveTextChunks(textChunks);
  }
}

export default async function handler(req, res) {
  console.log('handler called');
  // Check for the HTTP method if needed, e.g., if it's a POST or GET request
  if (req.method === 'POST') {
    let body = JSON.parse(req.body);

    console.log(body);

    for(let i = 0; i < body.length; i++) {
      let message = body[i];
      if ("fullDocument" in message) {
        const urls = message.fullDocument.urls;
        let idValueAsObject = JSON.parse(message.fullDocument._id);
        const bundleId = idValueAsObject["$oid"];

        processResearchBundle(bundleId, urls);
      }
    }

    // Return a JSON response with ok: true
    res.status(200).json({ ok: true });
  } else {
    // Handle other HTTP methods, e.g., if a GET request is made instead of POST
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}