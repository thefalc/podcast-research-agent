const { MongoClient } = require("mongodb");

require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function getBundles() {
  const client = new MongoClient(uri);
  let bundles = [];

  try {
    await client.connect();
    
    const database = client.db("podpre_ai");
    const collection = database.collection("research_bundles");

    bundles = await collection
      .find({}, { projection: { _id: 1, guestName: 1, company: 1, topic: 1, processed: 1 } })
      .sort({ created_date: -1 })
      .toArray();

    console.log(bundles);
  } catch (error) {
    console.error("Error getting data:", error);
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