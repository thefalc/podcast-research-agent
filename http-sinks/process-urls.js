const axios = require("axios");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { OpenAIEmbeddings, ChatOpenAI } = require("@langchain/openai");
const { saveTextChunks } = require("./util/save-text-chunks");
const dotenv = require('dotenv');
const express = require('express');

const router = express.Router();

// Load environment variables from .env file
dotenv.config();

// API endpoint called by Confluent
router.post('/', async (req, res) => {
  await handler(req, res);
});

// For local testing
router.get('/', async (req, res) => {
  await handler(req, res);
});

module.exports = router;
// export default router;

// Used to help with parsing content from websites
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0
});

// Initialize the OpenAI embedding model
const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-ada-002"
});

// Processors for different URL types
async function processTextURL(url) {
  try {
    const { data } = await axios.get(url);
    const text = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const content = await extractOrSummarizeContent(text);
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    const chunks = await splitter.createDocuments([content]);

    // Generate embeddings for each of the text chunks
    for(let i = 0; i < chunks.length; i++) {
      const embedding = await embeddings.embedQuery(chunks[i].pageContent);
      chunks[i].embedding = embedding;
    }

    return chunks;
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

async function processYoutubeURL(url) {
  // TODO
  return [];
}

async function processPodcastURL(url) {
  // TODO
  return [];
}

// Goes through each URL and extracts text and chunks for the content associated with the URL
async function processUrls(urls) {
  let urlToChunks = {};
  for(let i = 0; i < urls.length; i++) {
    let url = urls[i];
    console.log(i + " " + url);
    try {
      let chunks;
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        chunks = await processYoutubeURL(url);
      } else if (url.includes('podcasts.apple.com')) {
        chunks = await processPodcastURL(url);
      } else {
        chunks = await processTextURL(url);
      }
      
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
  let urlToChunks = await processUrls(urls);

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

async function handler(req, res) {
  // Check for the HTTP method if needed, e.g., if it's a POST or GET request
  if (req.method === 'POST') {
    let body = req.body;

    console.log(body);

    if (body.hasOwnProperty("fullDocument")) {
      const urls = body.fullDocument.urls;
      const bundleId = body.fullDocument._id["$oid"];
    
      processResearchBundle(bundleId, urls);
    }    

    // Return a JSON response with ok: true
    res.status(200).json({ ok: true });
  } else if (req.method === 'GET') { // TEST DATA
    let body = {
        clusterTime: 1730311795000,
        fullDocument: {
            urls: ["https://www.skyflow.com/post/cfpb-finalized-rule-1033-to-protect-data-privacy-what-to-know"],
            context: "ertewrt",
            _id: { "$oid": "67227672cbbf3fc15cb7f73f" },
            created_date: 1730311794080,
            title: "egterte"
        },
        ns: { coll: "research_bundles", db: "podpre_ai" },
        documentKey: { _id: { "$oid": "67227672cbbf3fc15cb7f73f" } },
        operationType: "insert",
        wallTime: 1730311795085,
        _id: {
            _data: "82672276730000000F2B042C0100296E5A10044B0F4371CE04414B90B99B2154132766463C6F7065726174696F6E54797065003C696E736572740046646F63756D656E744B65790046645F6964006467227672CBBF3FC15CB7F73F000004"
        }
    };

    const urls = body.fullDocument.urls;
    const bundleId = body.fullDocument._id["$oid"];

    console.log(urls);
    console.log(bundleId);

    processResearchBundle(bundleId, urls);

    res.status(200).json({ ok: true });
  } else {
    // Handle other HTTP methods, e.g., if a GET request is made instead of POST
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}