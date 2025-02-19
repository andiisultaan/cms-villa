import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomeIcon, PlusCircleIcon, LogOutIcon, UserPlusIcon, CalendarIcon, Building2Icon } from "lucide-react";
import { handleLogout } from "./utils/logout";

export default function Navigation() {
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

        <Link href="/villas" className="w-full">
          <Button variant="ghost" className="w-full justify-start">
            <Building2Icon className="mr-2 h-4 w-4" />
            Villas
          </Button>
        </Link>
      </div>

      <div className="flex flex-col space-y-1 mt-4">
        <div className="px-4 py-2 text-sm font-medium text-muted-foreground">Management</div>
        <Link href="/add-villa" className="w-full">
          <Button variant="ghost" className="w-full justify-start">
            <PlusCircleIcon className="mr-2 h-4 w-4" />
            Add Villa
          </Button>
        </Link>
        <Link href="/add-user" className="w-full">
          <Button variant="ghost" className="w-full justify-start">
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </Link>
      </div>

      <div className="mt-auto">
        <form action={handleLogout}>
          <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50">
            <LogOutIcon className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </form>
      </div>
    </nav>
  );
}
