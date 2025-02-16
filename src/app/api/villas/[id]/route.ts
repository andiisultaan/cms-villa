import { deleteVilla, getVillaById, serializeVilla, updateVilla } from "@/db/models/villa";
import cloudinary from "@/lib/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";
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

const villaUpdateSchema = z.object({
  name: z.string().min(1, { message: "Villa name is required" }).optional(),
  description: z.string().min(1, { message: "Description is required" }).optional(),
  price: z
    .string()
    .min(1, { message: "Price is required" })
    .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Price must be a positive number",
    })
    .optional(),
  capacity: z
    .string()
    .min(1, { message: "Capacity is required" })
    .refine(val => !isNaN(Number(val)) && Number.isInteger(Number(val)) && Number(val) > 0, {
      message: "Capacity must be a positive integer",
    })
    .optional(),
  status: z
    .enum(["available", "booked", "maintenance"], {
      errorMap: () => ({ message: "Status must be either 'available', 'booked', or 'maintenance'" }),
    })
    .optional(),
  existingImages: z
    .array(
      z.object({
        url: z.string().url(),
        publicId: z.string(),
      })
    )
    .optional(),
  newImages: z.array(z.instanceof(File)).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const contentType = req.headers.get("content-type");
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

    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;
    const price = formData.get("price") as string | null;
    const capacity = formData.get("capacity") as string | null;
    const status = formData.get("status") as string | null;
    const existingImagesJson = formData.get("existingImages") as string | null;
    const newImages = formData.getAll("newImages") as File[];

    const existingImages = existingImagesJson ? JSON.parse(existingImagesJson) : [];

    const data = {
      name,
      description,
      price,
      capacity,
      status,
      existingImages,
      newImages,
    };

    const parsedData = villaUpdateSchema.parse(data);

    // Process new images
    const processedNewImages = await Promise.all(
      (parsedData.newImages || []).map(async image => {
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

    // Combine existing and new images
    const allImages = [...(parsedData.existingImages || []), ...processedNewImages];

    // Update villa data
    const updatedVillaData = {
      ...parsedData,
      images: allImages,
    };

    const result = await updateVilla(id, updatedVillaData);

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
    const serializedUpdatedVilla = serializeVilla(updatedVilla);

    return NextResponse.json<MyResponse<typeof serializedUpdatedVilla>>(
      {
        statusCode: 200,
        message: `Success PUT /api/villas/${id}`,
        data: serializedUpdatedVilla,
      },
      { status: 200 }
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
        { status: 400 }
      );
    }

    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
