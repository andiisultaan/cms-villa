import { createUser, getUsers } from "@/db/models/user";
import { NextResponse } from "next/server";
import { z } from "zod";

type MyResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

//GET Users
export const GET = async () => {
  const users = await getUsers();
  return Response.json(
    {
      statusCode: 200,
      message: "Success GET /api/users",
      data: users,
    },
    {
      status: 200,
    }
  );
};

const userInputSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(["admin", "staff", "owner"], { message: "Role must be either 'admin', 'staff' or 'owner'" }),
});

// add user
export const POST = async (req: Request) => {
  try {
    const data = await req.json();

    const parsedData = userInputSchema.safeParse(data);

    if (!parsedData.success) {
      throw parsedData.error;
    }

    const user = await createUser(parsedData.data);

    return NextResponse.json<MyResponse<unknown>>(
      {
        statusCode: 201,
        message: "Success POST /api/users",
        data: user,
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
