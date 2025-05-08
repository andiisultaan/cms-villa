import { getMongoClientInstance } from "../config";
import { ObjectId, Db } from "mongodb";

export type BookModel = {
  _id: ObjectId;
  villaId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  orderId: string;
  paymentId: string;
  paymentStatus: string; // Changed from 'status' to 'paymentStatus'
  amount: number;
};

export type BookModelCreateInput = Omit<BookModel, "_id">;

const DATABASE_NAME = process.env.MONGODB_NAME || "gonjong-harau-db";
const COLLECTION_NAME = "Bookings";

export const getDb = async () => {
  const client = await getMongoClientInstance();
  const db: Db = client.db(DATABASE_NAME);

  return db;
};

export const getBookings = async () => {
  const db = await getDb();

  const bookings = (await db.collection(COLLECTION_NAME).find({}).toArray()) as BookModel[];

  return bookings;
};

export const createBooking = async (booking: BookModelCreateInput) => {
  const db = await getDb();

  const result = await db.collection(COLLECTION_NAME).insertOne(booking);

  return result;
};

export const getBookingById = async (id: string) => {
  const db = await getDb();
  const booking = (await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) })) as BookModel;

  return booking;
};

export const getBookingsByVillaId = async (villaId: string) => {
  const db = await getDb();
  const bookings = (await db.collection(COLLECTION_NAME).find({ villaId }).toArray()) as BookModel[];

  return bookings;
};

export const updateBookingPaymentStatus = async (id: string, paymentStatus: string) => {
  const db = await getDb();

  const result = await db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: { paymentStatus } });

  return result;
};

export const deleteBooking = async (id: string) => {
  const db = await getDb();

  const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

  return result;
};

export const getBookingsByDateRange = async (startDate: string, endDate: string) => {
  const db = await getDb();

  const bookings = (await db
    .collection(COLLECTION_NAME)
    .find({
      $or: [
        // Bookings that start during the range
        { checkInDate: { $gte: startDate, $lte: endDate } },
        // Bookings that end during the range
        { checkOutDate: { $gte: startDate, $lte: endDate } },
        // Bookings that span the entire range
        { $and: [{ checkInDate: { $lte: startDate } }, { checkOutDate: { $gte: endDate } }] },
      ],
    })
    .toArray()) as BookModel[];

  return bookings;
};

export const getBookingByOrderId = async (orderId: string) => {
  const db = await getDb();
  const booking = (await db.collection(COLLECTION_NAME).findOne({ orderId })) as BookModel;

  return booking;
};

export const updateBook = async (id: string, updateData: Partial<Omit<BookModel, "_id">>) => {
  const db = await getDb();

  const result = await db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: updateData });

  if (result.matchedCount === 0) {
    return null; // No document matched the ID
  }

  // Return the updated document
  const updatedBooking = await getBookingById(id);
  return updatedBooking;
};
