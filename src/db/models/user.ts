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

export const getUserByUsername = async (username: string) => {
  const db = await getDb();
  const user = (await db.collection(COLLECTION_NAME).findOne({ username: username })) as UserModel;

  return user;
};

export const deleteUser = async (userId: string) => {
  const db = await getDb();
  const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(userId) });

  return result;
};

export const updateUser = async (userId: string, user: Partial<UserModel>) => {
  const db = await getDb();
  const result = await db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(userId) }, { $set: user });

  return result;
};

export const getUserById = async (userId: string) => {
  const db = await getDb();
  const user = (await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(userId) })) as UserModel;

  return user;
};

export const changeUserPassword = async (userId: string, newPassword: string) => {
  const db = await getDb();

  // Hash the new password before storing
  const hashedPassword = hashText(newPassword);

  // Update only the password field
  const result = await db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(userId) }, { $set: { password: hashedPassword } });

  return result;
};
