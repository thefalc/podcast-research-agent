const { MongoClient } = require("mongodb");

// TODO: need to add the name of the guest and the company they work for
// TODO: need to figure out a way to determine when a given research bundle has been processed

require('dotenv').config();

// Replace with your actual MongoDB connection string and database name
const uri = `mongodb+srv://${process.env.MONGODB_DB_USER}:${process.env.MONGODB_DB_PWD}@experiments-cluster.fvvtm.mongodb.net/?retryWrites=true&w=majority&appName=experiments-cluster`;
const client = new MongoClient(uri);

async function saveBundle(data) {
  try {
    await client.connect();
    
    const database = client.db("podpre_ai");
    const collection = database.collection("research_bundles");

    // Insert data into the collection
    const result = await collection.insertOne(data);
    console.log(`Data saved with id: ${result.insertedId}`);
  } catch (error) {
    console.error("Error saving data:", error);
  } finally {
    await client.close();
  }
}

export default async function handler(req, res) {
  // Check for the HTTP method if needed, e.g., if it's a POST or GET request
  if (req.method === 'POST') {
    const { title, urls, context } = req.body;
    const newBundle = {
      title,
      urls,
      context,
      processed: false,
      created_date: new Date(), // Add the created_date timestamp
    };
    
    saveBundle(newBundle);

    // Return a JSON response with ok: true
    res.status(200).json({ ok: true });
  } else {
    // Handle other HTTP methods, e.g., if a GET request is made instead of POST
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}