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
    console.log(error);
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
    console.log(error);
    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

const imageSchema = z.union([
  z.object({
    url: z.string().url(),
    publicId: z.string(),
  }),
  z.string(), // To handle stringified JSON
  z.instanceof(File),
]);

const facilitiesSchema = z
  .object({
    bathroom: z.boolean().default(false),
    wifi: z.boolean().default(false),
    bed: z.boolean().default(false),
    parking: z.boolean().default(false),
    kitchen: z.boolean().default(false),
    ac: z.boolean().default(false),
    tv: z.boolean().default(false),
    pool: z.boolean().default(false),
  })
  .optional();

const villaUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.union([z.number(), z.string()]).optional(),
  capacity: z.union([z.number(), z.string()]).optional(),
  status: z.enum(["available", "booked", "maintenance"]).optional(),
  owner: z.string().optional(),
  facilities: facilitiesSchema,
  images: z.array(imageSchema).optional(),
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
    const owner = formData.get("owner") as string | null;
    const imagesData = formData.getAll("images");

    // Parse facilities from JSON string
    let facilities = {};
    const facilitiesData = formData.get("facilities");
    if (facilitiesData) {
      try {
        facilities = JSON.parse(facilitiesData as string);
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
      facilities,
      images: imagesData.map(image => {
        if (typeof image === "string") {
          try {
            return JSON.parse(image);
          } catch {
            return image;
          }
        }
        return image;
      }),
    };

    const parsedData = villaUpdateSchema.safeParse(data);

    if (!parsedData.success) {
      throw parsedData.error;
    }

    const processedImages = await Promise.all(
      (parsedData.data.images || []).map(async image => {
        if (image instanceof File) {
          const arrayBuffer = await image.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

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
        } else if (typeof image === "string") {
          // Assume this is a URL of an existing image
          return { url: image, publicId: "" };
        } else {
          // This is an existing image object
          return image;
        }
      })
    );

    // Update villa data
    const updatedVillaData = {
      ...parsedData.data,
      price: parsedData.data.price?.toString(),
      capacity: parsedData.data.capacity?.toString(),
      owner: parsedData.data.owner,
      facilities: parsedData.data.facilities,
      images: processedImages as { url: string; publicId?: string | undefined; file?: File | undefined }[],
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
      const errMessage = error.errors.map(e => e.message).join(", ");

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
