import { changeUserPassword, deleteUser, getUserById, updateUser } from "@/db/models/user";
import { NextRequest, NextResponse } from "next/server";

type MyResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params.id;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<MyResponse<typeof user>>(
      {
        statusCode: 200,
        message: `Success GET /api/users/${id}`,
        data: user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
};

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params.id;

    // Check if user exists before deleting
    const existingUser = await getUserById(id);

    if (!existingUser) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // Delete the user
    const result = await deleteUser(id);

    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 200,
        message: `Success DELETE /api/users/${id}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
};

export const PUT = async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params.id;
    const data = await request.json();

    // Check if user exists before updating
    const existingUser = await getUserById(id);

    if (!existingUser) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // Update the user
    const updatedUser = await updateUser(id, data);

    return NextResponse.json<MyResponse<typeof updatedUser>>(
      {
        statusCode: 200,
        message: `Success PUT /api/users/${id}`,
        data: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const { password } = await request.json();

    // Validate request body
    if (!password || typeof password !== "string") {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 400,
          error: "New password is required",
        },
        { status: 400 }
      );
    }

    // Check if password meets minimum requirements
    if (password.length < 6) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 400,
          error: "Password must be at least 6 characters long",
        },
        { status: 400 }
      );
    }

    // Check if user exists before updating password
    const existingUser = await getUserById(id);

    if (!existingUser) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 404,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    // Change the user's password
    const result = await changeUserPassword(id, password);

    if (result.modifiedCount === 0) {
      return NextResponse.json<MyResponse<never>>(
        {
          statusCode: 400,
          error: "Password could not be updated",
        },
        { status: 400 }
      );
    }

    return NextResponse.json<MyResponse<{ success: boolean }>>(
      {
        statusCode: 200,
        message: "Password updated successfully",
        data: { success: true },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json<MyResponse<never>>(
      {
        statusCode: 500,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
