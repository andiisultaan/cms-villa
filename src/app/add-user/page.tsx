"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/navigation";
import { toast, Toaster } from "sonner";
import { handleAddUser } from "./action";

interface FormData {
  username: string;
  password: string;
  role: string;
}

export default function AddUser() {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
    role: "",
  });
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({ username: "", password: "", role: "" });
  };

  const handleSelectChange = (value: string) => {
    setFormData(prevData => ({
      ...prevData,
      role: value,
    }));
  };

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await handleAddUser(formData);

      if (response.statusCode === 201) {
        toast.success("Successfully added new user!", {
          description: "Redirecting you to the dashboard page...",
        });
        router.refresh();
        resetForm();
      } else if (response.statusCode === 400) {
        toast.error(response.error || "Failed to add user", {
          description: "Please check your information and try again.",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add user", {
        description: "Please check your information and try again.",
      });
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Toaster richColors />
      <Navigation />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="container mx-auto p-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Add New User</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" name="username" type="text" value={formData.username} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" name="password" value={formData.password} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={handleSelectChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Add User
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
