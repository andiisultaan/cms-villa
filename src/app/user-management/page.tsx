"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2, Users, CheckCircle, UserPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/navigation";

type User = {
  _id: string;
  username: string;
  email: string;
  role: string;
};

async function deleteUser(id: string) {
  const response = await fetch(`/api/users/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete user");
  }
  return response.json();
}

async function fetchUsers(): Promise<User[]> {
  const response = await fetch("/api/users", {
    cache: "no-store", // Disable caching
    headers: {
      "Cache-Control": "no-cache",
      pragma: "no-cache",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  const data = await response.json();
  return data.data;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  // Get user session and role
  const { data: session } = useAuth();
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    fetchUsers()
      .then(fetchedUsers => {
        setUsers(fetchedUsers);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
        setIsLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id); // Set the ID of the user being deleted
      await deleteUser(id);
      setUsers(users.filter(user => user._id !== id));
      router.refresh(); // Refresh the page to update the stats
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } finally {
      setDeletingId(null); // Reset the deleting ID regardless of success or failure
    }
  };

  return (
    <>
      <Toaster richColors />
      <div className="flex h-screen bg-gray-200">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-8">
          <h1 className="text-3xl font-bold">User Management Dashboard</h1>

          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Data</CardTitle>
              {isAdmin && (
                <Link href="/add-user">
                  <Button size="sm">
                    <UserPlusIcon className=" h-4 w-4" />
                    Add User
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      {isAdmin && <TableHead className="text-right">Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length > 0 ? (
                      users.map(user => (
                        <TableRow key={user._id}>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex space-x-2 justify-end">
                                <Link href={`/edit-user/${user._id}`}>
                                  <Button variant="outline" size="icon" disabled={deletingId === user._id}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDelete(user._id)}
                                  disabled={deletingId !== null} // Disable all delete buttons when any deletion is in progress
                                >
                                  {deletingId === user._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-6 text-gray-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
