"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomeIcon, PlusCircleIcon, UserPlusIcon, CalendarIcon, Building2Icon, User } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LogoutButton from "./logout-button";

export default function Navigation() {
  // Use the auth hook to get the current session and user information
  const { data: session } = useAuth();
  const userRole = session?.user?.role;
  const username = session?.user?.username || "Guest";

  // Check if user is not an owner (meaning they can see management options)
  const canManage = userRole && userRole !== "owner";

  // Check if user has permission to add users (not staff or owner)
  const canAddUsers = userRole && userRole !== "owner" && userRole !== "staff";

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <nav className="flex flex-col h-screen w-64 p-4 bg-white shadow-md">
      <div className="mb-6">
        <h2 className="px-4 text-lg font-semibold">Gonjong Harau</h2>
      </div>

      <div className="flex flex-col space-y-1">
        <Link href="/" className="w-full">
          <Button variant="ghost" className="w-full justify-start">
            <HomeIcon className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>

        <Link href="/reservations" className="w-full">
          <Button variant="ghost" className="w-full justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Reservations
          </Button>
        </Link>

        <Link href="/report" className="w-full">
          <Button variant="ghost" className="w-full justify-start">
            <Building2Icon className="mr-2 h-4 w-4" />
            Financial Report
          </Button>
        </Link>
      </div>

      {/* Management section - visible to all management roles */}
      {canManage && (
        <div className="flex flex-col space-y-1 mt-4">
          <div className="px-4 py-2 text-sm font-medium text-muted-foreground">Management</div>
          <Link href="/add-villa" className="w-full">
            <Button variant="ghost" className="w-full justify-start">
              <PlusCircleIcon className="mr-2 h-4 w-4" />
              Add Villa
            </Button>
          </Link>

          {/* Only show Add User option to roles with permission (not staff) */}
          {canAddUsers && (
            <>
              {/* <Link href="/add-user" className="w-full">
                <Button variant="ghost" className="w-full justify-start">
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </Link> */}
              <Link href="/user-management" className="w-full">
                <Button variant="ghost" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  User Management
                </Button>
              </Link>
            </>
          )}
        </div>
      )}

      <div className="mt-auto">
        {/* User profile section */}
        <div className="flex flex-col gap-2 px-4 py-3 mb-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(username)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{username}</span>
              <span className="text-xs text-muted-foreground capitalize">{userRole || "Guest"}</span>
            </div>
          </div>

          <Link href="/profile" className="w-full">
            <Button variant="outline" size="sm" className="w-full justify-start mt-2">
              <User className="mr-2 h-4 w-4" />
              My Profile
            </Button>
          </Link>
        </div>

        <LogoutButton />
      </div>
    </nav>
  );
}
