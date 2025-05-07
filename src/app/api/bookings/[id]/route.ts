import { deleteBooking, getBookingById } from "@/db/models/book";
import { type NextRequest, NextResponse } from "next/server";

type MyResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

export const dynamic = "force-dynamic";
// GET a single booking by ID
export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params.id;
    const booking = await getBookingById(id);

    if (!booking) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "Booking not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<MyResponse<typeof booking>>(
      {
        statusCode: 200,
        message: `Success GET /api/bookings/${id}`,
        data: booking,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
};

// DELETE a booking by ID
export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params.id;

    // Check if booking exists before deleting
    const booking = await getBookingById(id);

    if (!booking) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "Booking not found",
        },
        { status: 404 }
      );
    }

    // Delete the booking
    const result = await deleteBooking(id);

    if (result.deletedCount === 0) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 400,
          error: "Failed to delete booking",
        },
        { status: 400 }
      );
    }

    return NextResponse.json<MyResponse<{ deleted: boolean }>>(
      {
        statusCode: 200,
        message: `Successfully deleted booking with ID: ${id}`,
        data: { deleted: true },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
};
