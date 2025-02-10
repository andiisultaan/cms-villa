"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/navigation";

export default function AddUser() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState({ type: "", content: "" });
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would send this data to your backend API
    console.log("New user:", { username, password, email, role });

    // Simulating a successful user creation
    setMessage({ type: "success", content: "User created successfully!" });

    // Reset form
    setUsername("");
    setPassword("");
    setEmail("");
    setRole("");

    // In a real app, you might redirect to a user list page
    // setTimeout(() => router.push('/users'), 2000)
  };

  return (
    <>
      <div className="flex h-screen bg-gray-100">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="container mx-auto p-4">
            <Card className="w-full max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Add New User</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {message.content && (
                    <Alert variant={message.type === "success" ? "default" : "destructive"}>
                      <AlertDescription>{message.content}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full">
                    Add User
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}
