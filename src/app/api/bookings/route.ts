import { createBooking, getBookings } from "@/db/models/book";
import { NextResponse } from "next/server";
import z from "zod";

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

const bookingInputSchema = z.object({
  villaId: z.string(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  guests: z.number(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  // Make these optional since they might not be present in all cases
  orderId: z.string().optional(),
  paymentId: z.string().optional(),
  paymentStatus: z.string().optional(),
  amount: z.number().optional(),
});

export const POST = async (request: Request) => {
  try {
    // Check if request has content before trying to parse JSON
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json<MyResponse<unknown>>(
        {
          statusCode: 400,
          error: "Request must have Content-Type: application/json",
        },
        { status: 400 }
      );
    }

    // Add explicit error handling for JSON parsing
    let data;
    try {
      const text = await request.text();
      if (!text || text.trim() === "") {
        return NextResponse.json<MyResponse<unknown>>(
          {
            statusCode: 400,
            error: "Request body is empty",
          },
          { status: 400 }
        );
      }
      data = JSON.parse(text);
    } catch (jsonError) {
      console.error("Error parsing JSON:", jsonError);
      return NextResponse.json<MyResponse<unknown>>(
        {
          statusCode: 400,
          error: "Invalid JSON in request body",
        },
        { status: 400 }
      );
    }

    const parsedData = bookingInputSchema.safeParse(data);

    if (!parsedData.success) {
      throw parsedData.error;
    }

    // Generate a unique orderId
    const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Add default values for optional fields to match BookModelCreateInput
    const bookingData = {
      ...parsedData.data,
      orderId: orderId, // Use the generated orderId
      paymentId: parsedData.data.paymentId || "", // Provide empty string as default
      paymentStatus: parsedData.data.paymentStatus || "pending", // Provide default status
      amount: parsedData.data.amount || 0, // Provide 0 as default
    };

    const result = await createBooking(bookingData);

    // Create booking data object with ID for response and email
    const responseData = {
      id: result.insertedId.toString(), // Convert ObjectId to string
      ...bookingData, // Include the generated orderId in the response
    };

    return NextResponse.json<MyResponse<unknown>>(
      {
        statusCode: 201,
        message: "Booking created successfully",
        data: responseData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating booking:", error);

    return NextResponse.json<MyResponse<unknown>>(
      {
        statusCode: 500,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
};
