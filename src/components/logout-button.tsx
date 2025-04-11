"use client";

import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleClientLogout } from "@/components/utils/logout";

export default function LogoutButton() {
  return (
    <Button variant="ghost" onClick={handleClientLogout} className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50">
      <LogOutIcon className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
}
