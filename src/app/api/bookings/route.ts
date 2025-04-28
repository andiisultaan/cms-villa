import { getBookings } from "@/db/models/book";

type MyResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

//GET Reservations
export const GET = async () => {
  const bookings = await getBookings();
  return Response.json(
    {
      statusCode: 200,
      message: "Success GET /api/bookings",
      data: bookings,
    },
    {
      status: 200,
    }
  );
};
