import { deleteBooking, getBookingById, updateBook } from "@/db/models/book";
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

// PATCH to update a booking by ID
export const PATCH = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params.id;

    // Check if booking exists before updating
    const existingBooking = await getBookingById(id);

    if (!existingBooking) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "Booking not found",
        },
        { status: 404 }
      );
    }

    // Parse the request body
    const body = await request.json();

    // Validate required fields if needed
    const updateData: Partial<{
      villaId: string;
      checkInDate: string;
      checkOutDate: string;
      guests: number;
      name: string;
      email: string;
      phone: string;
      paymentStatus: string;
      amount: number;
      orderId: string;
      paymentId: string;
      extraBed: number; // Added extra bed field
      priceExtraBed: number; // Added price extra bed field
    }> = {};

    // Only include fields that are provided in the request
    if (body.villaId !== undefined) updateData.villaId = body.villaId;
    if (body.checkInDate !== undefined) updateData.checkInDate = body.checkInDate;
    if (body.checkOutDate !== undefined) updateData.checkOutDate = body.checkOutDate;
    if (body.guests !== undefined) updateData.guests = body.guests;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.orderId !== undefined) updateData.orderId = body.orderId;
    if (body.paymentId !== undefined) updateData.paymentId = body.paymentId;
    if (body.extraBed !== undefined) updateData.extraBed = body.extraBed; // Handle extra bed field
    if (body.priceExtraBed !== undefined) updateData.priceExtraBed = body.priceExtraBed; // Handle price extra bed field

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 400,
          error: "No valid fields to update",
        },
        { status: 400 }
      );
    }

    // Update the booking
    const updatedBooking = await updateBook(id, updateData);

    if (!updatedBooking) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 400,
          error: "Failed to update booking",
        },
        { status: 400 }
      );
    }

    return NextResponse.json<MyResponse<typeof updatedBooking>>(
      {
        statusCode: 200,
        message: `Successfully updated booking with ID: ${id}`,
        data: updatedBooking,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating booking:", error);
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
