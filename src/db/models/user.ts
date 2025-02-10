import { getMongoClientInstance } from "../config";
import { ObjectId, Db } from "mongodb";
import { hashText } from "../utils/bcrypt";

export type UserModel = {
  _id: ObjectId;
  username: string;
  password: string;
  role?: string;
};

export type UserModelCreateInput = Omit<UserModel, "_id">;

const DATABASE_NAME = process.env.MONGODB_NAME || "gonjong-harau-db";
const COLLECTION_NAME = "Users";

export const getDb = async () => {
  const client = await getMongoClientInstance();
  const db: Db = client.db(DATABASE_NAME);

  return db;
};

export const getUsers = async () => {
  const db = await getDb();

  const users = (await db.collection(COLLECTION_NAME).find({}).project({ password: 0 }).toArray()) as UserModel[];

  return users;
};

export const createUser = async (user: UserModelCreateInput) => {
  const modifiedUser: UserModelCreateInput = {
    ...user,
    password: hashText(user.password),
  };

  const db = await getDb();

  const result = await db.collection(COLLECTION_NAME).insertOne(modifiedUser);

  return result;
};
