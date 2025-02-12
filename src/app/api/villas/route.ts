import { createVilla, getVillas } from "@/db/models/villa";
import { NextResponse } from "next/server";
import { z } from "zod";

type MyResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

// GET Villas
export const GET = async () => {
  const villas = await getVillas();
  return Response.json(
    {
      statusCode: 200,
      message: "Success GET /api/villas",
      data: villas,
    },
    {
      status: 200,
    }
  );
};

const villaInputSchema = z.object({
  name: z.string().min(1, { message: "Villa name is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  price: z.number().positive({ message: "Price must be a positive number" }),
  capacity: z.number().int().positive({ message: "Capacity must be a positive integer" }),
  status: z.enum(["available", "booked", "maintenance"], { message: "Status must be either 'available', 'booked', or 'maintenance'" }),
  images: z.array(z.string().url({ message: "Invalid image URL" })).min(1, { message: "At least one image is required" }),
});

// Add villa
export const POST = async (req: Request) => {
  try {
    const data = await req.json();

    const parsedData = villaInputSchema.safeParse(data);

    if (!parsedData.success) {
      throw parsedData.error;
    }

    const villa = await createVilla(parsedData.data);

    return NextResponse.json<MyResponse<unknown>>(
      {
        statusCode: 201,
        message: "Success POST /api/villas",
        data: villa,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errMessage = error.issues[0].message;

      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 400,
          error: errMessage,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        message: "Internal Server Error !",
      },
      {
        status: 500,
      }
    );
  }
};
