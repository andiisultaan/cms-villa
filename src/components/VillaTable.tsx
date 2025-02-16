"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";

type SerializedVilla = {
  _id: string;
  name: string;
  description: string;
  price: string;
  capacity: string;
  status: "available" | "booked" | "maintenance";
  images: Array<{ url: string; publicId: string }>;
};

async function deleteVilla(id: string) {
  const response = await fetch(`/api/villas/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete villa");
  }
  return response.json();
}

function VillaTable({ initialVillas }: { initialVillas: SerializedVilla[] }) {
  const [villas, setVillas] = useState<SerializedVilla[]>(initialVillas);
  const router = useRouter();

  const handleDelete = async (id: string) => {
    try {
      await deleteVilla(id);
      setVillas(villas.filter(villa => villa._id !== id));
      router.refresh(); // Refresh the page to update the stats
      toast.success("Villa deleted successfully");
    } catch (error) {
      console.error("Error deleting villa:", error);
      toast.error("Failed to delete villa");
    }
  };

  return (
    <>
      <Toaster richColors />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Price per Night</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {villas.map(villa => (
            <TableRow key={villa._id}>
              <TableCell>{villa.name}</TableCell>
              <TableCell>{villa.description}</TableCell>
              <TableCell>${villa.price}</TableCell>
              <TableCell>{villa.capacity}</TableCell>
              <TableCell>{villa.status}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(villa._id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

export default VillaTable;
