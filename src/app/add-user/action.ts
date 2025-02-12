const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

type MyResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

export async function handleAddUser(formData: { [key: string]: any }) {
  const res = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  const message: MyResponse<unknown> = await res.json();
  return message;
}
