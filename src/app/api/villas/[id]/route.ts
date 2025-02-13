import { deleteVilla, getVillaById, updateVilla } from "@/db/models/villa";
import { NextResponse } from "next/server";
import { z } from "zod";

type MyResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

//GET Villa by id

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    if (!id) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 400,
          error: "Villa ID is not provided",
        },
        { status: 400 }
      );
    }

    const villa = await getVillaById(id);

    if (!villa) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "Villa not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        statusCode: 200,
        message: `Success GET /api/villas/${id}`,
        data: villa,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

// DELETE Villa
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const result = await deleteVilla(id);

    if (result.deletedCount === 0) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "Villa not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<MyResponse<unknown>>(
      {
        statusCode: 200,
        message: `Success DELETE /api/villas/${id}`,
        data: { id },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

const statusUpdateSchema = z.object({
  status: z.enum(["available", "booked", "maintenance"], {
    message: "Status must be either 'available', 'booked', or 'maintenance'",
  }),
});

// PATCH Villa Status
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const data = await request.json();

    const parsedData = statusUpdateSchema.safeParse(data);

    if (!parsedData.success) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 400,
          error: parsedData.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const existingVilla = await getVillaById(id);

    if (!existingVilla) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "Villa not found",
        },
        { status: 404 }
      );
    }

    const result = await updateVilla(id, { status: parsedData.data.status });

    if (result.matchedCount === 0) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "Villa not found",
        },
        { status: 404 }
      );
    }

    const updatedVilla = await getVillaById(id);

    return NextResponse.json<MyResponse<unknown>>(
      {
        statusCode: 200,
        message: `Success PATCH /api/villas/${id}`,
        data: updatedVilla,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
