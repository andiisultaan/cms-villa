import { MongoClient } from "mongodb";

const connectionString = process.env.MONGO_DB_COLLECTION_STRING || "";

if (!connectionString) {
  throw new Error("No connection string found");
}

let client: MongoClient;

export const getMongoClientInstance = async () => {
  if (!client) {
    client = new MongoClient(connectionString);
    await client.connect();
  }

  return client;
};
