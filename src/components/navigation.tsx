import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomeIcon, PlusCircleIcon, LogOutIcon, UserPlusIcon } from "lucide-react";
import { handleLogout } from "./utils/logout";

export default function Navigation() {
  return (
    <nav className="flex flex-col space-y-2 p-4 bg-white shadow-md">
      <Link href="/" className="w-full">
        <Button variant="ghost" className="w-full justify-start">
          <HomeIcon className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
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
      <form action={handleLogout}>
        <Button variant="ghost" className="w-full justify-start mt-auto">
          <LogOutIcon className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </form>
    </nav>
  );
}
