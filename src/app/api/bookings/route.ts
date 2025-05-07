import { getBookings } from "@/db/models/book";

type MyResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

export const dynamic = "force-dynamic";

//GET Reservations
export const GET = async () => {
  const bookings = await getBookings();

  // Return response with no-cache headers to prevent Vercel from caching
  return Response.json(
    {
      statusCode: 200,
      message: "Success GET /api/bookings",
      data: bookings,
    },
    {
      status: 200,
      headers: {
        // Prevent caching at all levels (browser, CDN, etc.)
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        // Add a timestamp to help debugging
        "X-Response-Time": new Date().toISOString(),
      },
    }
  );
};
