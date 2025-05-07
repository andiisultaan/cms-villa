import { createVilla, getVillas } from "@/db/models/villa";
import cloudinary from "@/lib/cloudinary";
import { type NextRequest, NextResponse } from "next/server";
import type { UploadApiResponse } from "cloudinary";
import { z } from "zod";

type MyResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

export const dynamic = "force-dynamic";

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

const facilitiesSchema = z.object({
  bathroom: z.boolean().default(false),
  wifi: z.boolean().default(false),
  bed: z.boolean().default(false),
  parking: z.boolean().default(false),
  kitchen: z.boolean().default(false),
  ac: z.boolean().default(false),
  tv: z.boolean().default(false),
  pool: z.boolean().default(false),
});

const villaInputSchema = z.object({
  name: z.string().min(1, { message: "Villa name is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  price: z
    .string()
    .min(1, { message: "Price is required" })
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Price must be a positive number",
    }),
  capacity: z
    .string()
    .min(1, { message: "Capacity is required" })
    .refine(val => !isNaN(Number(val)) && Number.isInteger(Number(val)) && Number(val) > 0, {
      message: "Capacity must be a positive integer",
    }),
  status: z.enum(["available", "booked", "maintenance"], {
    errorMap: () => ({ message: "Status must be either 'available', 'booked', or 'maintenance'" }),
  }),
  owner: z.string().min(1, { message: "Owner is required" }),
  images: z.array(z.instanceof(File)).min(1, { message: "At least one image is required" }),
  facilities: facilitiesSchema.optional(),
});

// Add villa
export const POST = async (req: NextRequest) => {
  try {
    const contentType = req.headers.get("content-type");
    console.log("Content-Type:", contentType);
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 400,
          error: "Invalid content type. Expected multipart/form-data.",
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const capacity = formData.get("capacity") as string;
    const status = formData.get("status") as string;
    const owner = formData.get("owner") as string;
    const images = formData.getAll("images") as File[];

    // Parse facilities from JSON string
    let facilities = facilitiesSchema.parse({
      bathroom: false,
      wifi: false,
      bed: false,
      parking: false,
      kitchen: false,
      ac: false,
      tv: false,
      pool: false,
    });

    const facilitiesData = formData.get("facilities");
    if (facilitiesData) {
      try {
        const parsedFacilities = JSON.parse(facilitiesData as string);
        facilities = facilitiesSchema.parse(parsedFacilities);
      } catch (error) {
        console.error("Error parsing facilities:", error);
      }
    }

    const data = {
      name,
      description,
      price,
      capacity,
      status,
      owner,
      images,
      facilities,
    };

    const parsedData = villaInputSchema.safeParse(data);

    if (!parsedData.success) {
      throw parsedData.error;
    }

    // Process images
    const processedImages = await Promise.all(
      images.map(async image => {
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary
        const result = await new Promise<UploadApiResponse>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream({ folder: "villas" }, (error, result) => {
              if (error) reject(error);
              else resolve(result as UploadApiResponse);
            })
            .end(buffer);
        });

        return {
          url: result.secure_url,
          publicId: result.public_id,
        };
      })
    );

    // Create villa with Cloudinary image URLs and owner
    const villa = await createVilla({
      name: parsedData.data.name,
      description: parsedData.data.description,
      price: parsedData.data.price,
      capacity: parsedData.data.capacity,
      status: parsedData.data.status,
      owner: parsedData.data.owner,
      facilities: facilities, // Use the properly parsed facilities
      images: processedImages, // Use the processed images
    });

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
    console.error(error);
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
