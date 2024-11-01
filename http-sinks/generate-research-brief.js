const { MongoClient, ObjectId } = require("mongodb");
const { OpenAIEmbeddings, ChatOpenAI } = require("@langchain/openai");
const dotenv = require('dotenv');
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const express = require('express');

const router = express.Router();

// Load environment variables from .env file
dotenv.config();

// Replace with your actual MongoDB connection string and database name
const uri = `mongodb+srv://${process.env.MONGODB_DB_USER}:${process.env.MONGODB_DB_PWD}@experiments-cluster.fvvtm.mongodb.net/?retryWrites=true&w=majority&appName=experiments-cluster`;
const client = new MongoClient(uri);

const model = new ChatOpenAI({ model: "gpt-4" });

// Initialize the OpenAI embedding model
const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-ada-002"
});

// API endpoint called by Confluent
router.post('/', async (req, res) => {
  await handler(req, res);
});

// For local testing
router.get('/', async (req, res) => {
  await handler(req, res);
});

module.exports = router;

async function getBundle(bundleId) {
  try {
    await client.connect();
    
    const database = client.db("podpre_ai");
    const collection = database.collection("research_bundles");

    const query = { _id: new ObjectId(bundleId) };
    const projection = { title: 1, text: 1, context: 1 }; // Specify fields to retrieve
    const result = await collection.findOne(query, { projection });

    return result;
  } catch (error) {
    console.error("Error saving data:", error);
  } finally {
    await client.close();
  }
}

async function getRelevantChunks(bundleId, searchString) {
  const searchEmbedding = await embeddings.embedQuery(searchString);

  try {
    await client.connect();
    // set namespace
    const database = client.db("podpre_ai");
    const coll = database.collection("text_embeddings");
    // define pipeline
    const agg = [
        {
          "$vectorSearch": {
            "index": "ResearchBundleSemanticSearch",
            // "filter": { "bundleId": { "$eq": bundleId } }, FIX THIS
            "path": "embedding",
            "queryVector": searchEmbedding,
            "numCandidates": 150,
            "limit": 10
          }
        }, {
          '$project': {
            '_id': 0, 
            'text': 1,
            'score': {
              '$meta': 'vectorSearchScore'
            }
          }
        }
      ];

    // Execute search
    const result = await coll.aggregate(agg).toArray();

    return result;
  } catch(e) {
    console.log(e);
  } finally {
      await client.close();
  }
}

async function getResearchContext(bundleId) {
  let researchBundle = await getBundle(bundleId);
  console.log(researchBundle);
  let relevantChunks = await getRelevantChunks(bundleId, researchBundle.context);
  console.log(relevantChunks);
  // const relevantText = relevantChunks.map(item => item.text).join('\n' + '='.repeat(20) + '\n');

  // const userPrompt = `
  //   Additional Context:
  //   ${researchBundle.context}

  //   Relevant Research Materials:
  //   ${relevantText}

  //   Generate a podcast research brief and set of suggested questions based on the research available.
  // `;

  // const systemPrompt = `You are a podcast host and expert in AI, databases, and data engineering.
  //   Using the available research material, create a podcast research brief that contains relevant 
  //   background about the guest and topic and a list of 15 to 20 suggested questions along. For the
  //   questions, have a flow that begins with introductory type questions, then questions that lets
  //   us get into technical details, wrapping up with questions about the future.
  //   For each question, when relevant, add in interesting points for you to make based on the
  //   likely response. Make suggestions for additional context to weave into the conversation to
  //   make the podcast engaging, interesting, and smart.`;

  // const messages = [
  //   new SystemMessage(systemPrompt),
  //   new HumanMessage(userPrompt),
  // ];
  
  // const response = await model.invoke(messages);

  // console.log(response.content);
}

async function handler(req, res) {
  console.log("here");

  // Check for the HTTP method if needed, e.g., if it's a POST or GET request
  if (req.method === 'POST') {
    let body = req.body;

    const urls = body.bundleId;

    // Return a JSON response with ok: true
    res.status(200).json({ ok: true });
  } else if (req.method === 'GET') { // TEST DATA
    const bundleId = '67227672cbbf3fc15cb7f73f';

    console.log(bundleId);
    let context = await getResearchContext(bundleId);

    res.status(200).json({ ok: true });
  } else {
    // Handle other HTTP methods, e.g., if a GET request is made instead of POST
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}