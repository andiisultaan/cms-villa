"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import Link from "next/link";

type Reservation = {
  _id: string;
  name: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
};

async function deleteReservation(id: string) {
  const response = await fetch(`/api/reservations/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete reservation");
  }
  return response.json();
}

async function fetchReservations(): Promise<Reservation[]> {
  const response = await fetch("/api/reservations");
  if (!response.ok) {
    throw new Error("Failed to fetch reservations");
  }
  const data = await response.json();
  return data.data;
}

function formatToIDR(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ReservationsTable() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchReservations()
      .then(fetchedReservations => {
        setReservations(fetchedReservations);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error fetching reservations:", error);
        toast.error("Failed to fetch reservations");
        setIsLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteReservation(id);
      setReservations(reservations.filter(reservation => reservation._id !== id));
      toast.success("Reservation deleted successfully");
    } catch (error) {
      console.error("Error deleting reservation:", error);
      toast.error("Failed to delete reservation");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Toaster richColors />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guest Name</TableHead>
            <TableHead>Check-in Date</TableHead>
            <TableHead>Check-out Date</TableHead>
            <TableHead>Total Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map(reservation => (
            <TableRow key={reservation._id}>
              <TableCell>{reservation.name}</TableCell>
              <TableCell>{formatDate(reservation.checkInDate)}</TableCell>
              <TableCell>{formatDate(reservation.checkOutDate)}</TableCell>
              <TableCell>{formatToIDR(reservation.totalPrice)}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                    reservation.status === "confirmed"
                      ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                      : reservation.status === "cancelled"
                      ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                      : "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20"
                  }`}
                >
                  {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Link href={`/edit-reservation/${reservation._id}`}>
                    <Button variant="outline" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(reservation._id)}>
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

export default ReservationsTable;
