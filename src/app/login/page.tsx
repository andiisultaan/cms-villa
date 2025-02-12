"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { handleLogin } from "./action";
import { useFormState, useFormStatus } from "react-dom";
import { Toaster, toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Logging in..." : "Login"}
    </Button>
  );
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
      <svg className="animate-spin h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const [state, formAction] = useFormState(handleLogin, null);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (state) {
      if (state.error) {
        toast.error(state.error);
      } else if (state.success) {
        toast.success(state.success);
        setShowLoading(true);
        setTimeout(() => {
          router.push("/");
        }, 2000); // Redirect after 2 seconds to show loading animation
      }
    }
  }, [state, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Toaster richColors />
      {showLoading && <LoadingOverlay />}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Gonjong Harau Administration</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" name="username" placeholder="Enter your username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" name="password" placeholder="Enter your password" required />
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
