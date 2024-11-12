const { MongoClient, ObjectId } = require("mongodb");
const { OpenAIEmbeddings, ChatOpenAI } = require("@langchain/openai");

const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const uri = process.env.MONGODB_URI;
const model = new ChatOpenAI({ model: "gpt-4" });

// Delay of 1 minute
const delay = 1 * 60 * 1000;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize the OpenAI embedding model
const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-ada-002"
});

async function getBundle(bundleId) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    
    const database = client.db("podpre_ai");
    const collection = database.collection("research_bundles");

    const query = { _id: new ObjectId(bundleId) };
    const projection = { guestName: 1, company: 1, topic: 1, context: 1, processed : 1 };
    const result = await collection.findOne(query, { projection });

    return result;
  } catch (error) {
    console.error("Error saving data:", error);
  } finally {
    await client.close();
  }
}

// Pulls all the mined questsion from the DB
async function getExistingResearchQuestions(bundleId) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    
    const database = client.db("podpre_ai");
    const collection = database.collection("mined_questions");

    const projection = { questions : 1 };
    const result = await collection.find({ bundleId }, { projection }).toArray();

    return result;
  } catch (error) {
    console.error("Error saving data:", error);
  } finally {
    await client.close();
  }
}

// Uses the research bundle input to create a search query for the text pulled from the source material
async function getSearchString(researchBundle) {
  const userPrompt = `
      Guest:
      ${researchBundle.guestName}

      Company:
      ${researchBundle.company}

      Topic:
      ${researchBundle.topic}

      Context:
      ${researchBundle.context}

      Create a natural language search query given the data available.
    `;

    const systemPrompt = `You are an expert in research for a engineering podcast. Using the
      guest name, company, topic, and context, create the best possible query to search a vector
      database for relevant data mined from blog posts and existing podcasts.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];
    
    const response = await model.invoke(messages);
    
    return response.content;
}

async function getRelevantChunks(bundleId, researchBundle) {
  const searchString = await getSearchString(researchBundle);

  console.log("Search string: " + searchString);

  const searchEmbedding = await embeddings.embedQuery(searchString);
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const database = client.db("podpre_ai");
    const coll = database.collection("text_embeddings");

    // Define pipeline
    const agg = [
        {
          "$vectorSearch": {
            "index": "vector_index",
            "filter": { "bundleId": { "$eq": bundleId } },
            "path": "embedding",
            "queryVector": searchEmbedding,
            "numCandidates": 150,
            "limit": 15
          }
        }, {
          "$project": {
            "_id": 0, 
            "text": 1,
            "bundleId": 1,
            "score": {
              "$meta": "vectorSearchScore"
            }
          }
        }
      ];

    // console.log(agg);

    // Execute search
    const result = await coll.aggregate(agg).toArray();

    return result;
  } catch(e) {
    console.log(e);
  } finally {
      await client.close();
  }
}

async function updateResearchBundle(bundleId, researchBriefText) {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("podpre_ai");
    const collection = database.collection("research_bundles");

    // Update the document with the specified bundleId
    const result = await collection.updateOne(
      { _id: new ObjectId(bundleId) }, // Match document by _id
      {
        $set: {
          researchBriefText: researchBriefText, // Set the researchBriefText
          processed: true, // Set processed to true
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("No document found with the specified _id");
    }

    console.log(`Successfully updated research bundle with id: ${bundleId}`);
    return result;
  } catch (error) {
    console.error("Error updating research bundle:", error);
    throw error;
  } finally {
    await client.close();
  }
}

async function buildResearchBrief(bundleId) {
  console.log(bundleId);
  let researchBundle = await getBundle(bundleId);
  console.log(researchBundle);

  // Don't re-processed a brief
  if (researchBundle !== null && !researchBundle.processed) {
    let existingQuestions = await getExistingResearchQuestions(bundleId);
    const flattenedQuestions = existingQuestions
      .map(item => item.questions) // Extract the questions property from each item
      .join('\n'); // Join all question strings with a single newline character
    console.log(flattenedQuestions);

    let relevantChunks = await getRelevantChunks(bundleId, researchBundle);
    console.log("relevant chunks");
    console.log(relevantChunks);
    const relevantText = relevantChunks.map(item => item.text).join('\n' + '='.repeat(20) + '\n');

    const userPrompt = `
      Additional Context:
      ${researchBundle.context}

      Research Material:
      ${relevantText}

      Potential Questions:
      ${flattenedQuestions}

      Generate a podcast research brief and set of suggested questions based on the research available.
    `;

    const systemPrompt = `You are a podcast host and expert in AI, databases, and data engineering.
      You are interviewing ${researchBundle.guestName} from the company ${researchBundle.company}
      about ${researchBundle.topic}.

      Using the additional context, research material, and set of potential questions, create a
      podcast research brief that contains relevant 
      background about the guest and topic and a list of 15 to 20 interesting questions that will
      help create a technical and interesting conversation.
      
      For the questions, have a flow that begins with introductory type questions, then questions that lets
      us get into technical details, wrapping up with questions about the future.

      For each question, when relevant, add interesting points just below the question formatted as bullets
      for you to make to help contribute to the conversation.
      
      Make suggestions for additional context to weave into the conversation to
      make the podcast engaging, interesting, and smart.
      
      Make sure to format the response as HTML where sub headings use H tags, text is a <p>, and
      numbered lists use <ol> so it can be rendered beautifully on a website `;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];
    
    const response = await model.invoke(messages);
    let researchBriefText = response.content;

    console.log(researchBriefText);
    
    await updateResearchBundle(bundleId, researchBriefText);

    console.log("bundle has been processed");
  }
}

export default async function handler(req, res) {
  console.log("generate research brief");
  // Check for the HTTP method if needed, e.g., if it's a POST or GET request
  if (req.method === 'POST') {
    let body = JSON.parse(req.body);
    console.log(body);

    for(let i = 0; i < body.length; i++) {
      if ("bundleId" in body[i]) {
        let bundleId = body[i].bundleId;

        buildResearchBrief(bundleId);
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