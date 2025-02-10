"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HomeIcon, PlusCircleIcon, LogOutIcon, UserPlusIcon } from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    router.push("/login");
  };

  return (
    <nav className="flex flex-col space-y-2 p-4 bg-white shadow-md">
      <Link href="/">
        <Button variant="ghost" className={cn("w-full justify-start", pathname === "/" && "bg-slate-100")}>
          <HomeIcon className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/add-villa">
        <Button variant="ghost" className={cn("w-full justify-start", pathname === "/add-villa" && "bg-slate-100")}>
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          Add Villa
        </Button>
      </Link>
      <Link href="/add-user">
        <Button variant="ghost" className={cn("w-full justify-start", pathname === "/add-user" && "bg-slate-100")}>
          <UserPlusIcon className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </Link>
      <Button variant="ghost" className="w-full justify-start mt-auto" onClick={handleLogout}>
        <LogOutIcon className="mr-2 h-4 w-4" />
        Logout
      </Button>
    </nav>
  );
}
