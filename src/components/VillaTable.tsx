"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Link from "next/link";

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

async function fetchVillas(): Promise<SerializedVilla[]> {
  const response = await fetch("/api/villas");
  if (!response.ok) {
    throw new Error("Failed to fetch villas");
  }
  const data = await response.json();
  return data.data;
}

function formatToIDR(price: string): string {
  const numPrice = Number.parseFloat(price);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice);
}

// Function to truncate text to a specific character limit
function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;

  // Try to truncate at a word boundary
  const truncated = text.substring(0, limit);
  const lastSpaceIndex = truncated.lastIndexOf(" ");

  // If there's a space in the truncated text, cut at the last space
  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex) + "...";
  }

  // Otherwise just truncate at the limit
  return truncated + "...";
}

function VillaTable() {
  const [villas, setVillas] = useState<SerializedVilla[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchVillas()
      .then(fetchedVillas => {
        setVillas(fetchedVillas);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching villas:", error);
        toast.error("Failed to fetch villas");
        setIsLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id); // Set the ID of the villa being deleted
      await deleteVilla(id);
      setVillas(villas.filter(villa => villa._id !== id));
      router.refresh(); // Refresh the page to update the stats
      toast.success("Villa deleted successfully");
    } catch (error) {
      console.error("Error deleting villa:", error);
      toast.error("Failed to delete villa");
    } finally {
      setDeletingId(null); // Reset the deleting ID regardless of success or failure
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading villas...</span>
      </div>
    );
  }

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
              <TableCell title={villa.description}>{truncateText(villa.description, 50)}</TableCell>
              <TableCell>{formatToIDR(villa.price)}</TableCell>
              <TableCell>{villa.capacity}</TableCell>
              <TableCell>{villa.status}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Link href={`/edit-villa/${villa._id}`}>
                    <Button variant="outline" size="icon" disabled={deletingId === villa._id}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(villa._id)}
                    disabled={deletingId !== null} // Disable all delete buttons when any deletion is in progress
                  >
                    {deletingId === villa._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
