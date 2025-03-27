const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

interface FormData {
  username: string;
  password: string;
  role: string;
}

type MyResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

export async function handleAddUser(formData: FormData) {
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
