import { getMongoClientInstance } from "../config";
import { ObjectId, Db } from "mongodb";

export type VillaModel = {
  _id: ObjectId;
  name: string;
  description: string;
  price: string;
  capacity: string;
  status: "available" | "booked" | "maintenance";
  images: Array<{ url: string; publicId: string }>;
};

export type VillaModelCreateInput = Omit<VillaModel, "_id">;

const DATABASE_NAME = process.env.MONGODB_NAME || "gonjong-harau-db";
const COLLECTION_NAME = "Villas";

export const getDb = async () => {
  const client = await getMongoClientInstance();
  const db: Db = client.db(DATABASE_NAME);

  return db;
};

export const getVillas = async () => {
  const db = await getDb();

  const villas = (await db.collection(COLLECTION_NAME).find({}).toArray()) as VillaModel[];

  return villas;
};

export const createVilla = async (villa: VillaModelCreateInput) => {
  const db = await getDb();

  const result = await db.collection(COLLECTION_NAME).insertOne(villa);

  return result;
};

export const getVillaById = async (id: string) => {
  const db = await getDb();
  const villa = (await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) })) as VillaModel;

  return villa;
};

export const updateVilla = async (id: string, updateData: Partial<VillaModelCreateInput>) => {
  const db = await getDb();

  const result = await db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: updateData });

  return result;
};

export const deleteVilla = async (id: string) => {
  const db = await getDb();

  const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

  return result;
};
