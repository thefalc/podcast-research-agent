import { MongoClient, ObjectId } from "mongodb";

const uri = `mongodb+srv://${process.env.MONGODB_DB_USER}:${process.env.MONGODB_DB_PWD}@experiments-cluster.fvvtm.mongodb.net/?retryWrites=true&w=majority&appName=experiments-cluster`;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id } = req.query;

  try {
    const client = new MongoClient(uri);
    await client.connect();
    const database = client.db("podpre_ai");
    const collection = database.collection("research_bundles");

    // Fetch the document with the specified id
    const bundle = await collection.findOne({ _id: new ObjectId(id) });

    if (!bundle) {
      return res.status(404).json({ message: "Bundle not found" });
    }

    res.status(200).json(bundle);
  } catch (error) {
    console.error("Error fetching bundle:", error);
    res.status(500).json({ message: "Error fetching bundle" });
  }
}
