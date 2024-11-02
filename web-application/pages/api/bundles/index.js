const { MongoClient } = require("mongodb");

require('dotenv').config();

const uri = process.env.MONGODB_URI;
console.log(uri);
const client = new MongoClient(uri);

async function getBundles() {
  let bundles = [];

  try {
    await client.connect();
    
    const database = client.db("podpre_ai");
    const collection = database.collection("research_bundles");

    // Fetch only _id, title, and processed fields
    bundles = await collection
      .find({}, { projection: { _id: 1, guestName: 1, company: 1, topic: 1, processed: 1 } })
      .sort({ created_date: -1 })
      .toArray();
  } catch (error) {
    console.error("Error saving data:", error);
  } finally {
    await client.close();
  }

  return bundles;
}

export default async function handler(req, res) {
  let bundles = await getBundles();

  console.dir(bundles);

  res.status(200).json({ ok: true, bundles: bundles });
}