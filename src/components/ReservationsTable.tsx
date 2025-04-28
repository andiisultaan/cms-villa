"use client";

import { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

type Book = {
  _id: string;
  villaId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  orderId: string;
  paymentId: string;
  paymentStatus: string;
  amount: number;
};

type Villa = {
  _id: string;
  name: string;
  description: string;
  price: string;
  capacity: string;
  status: string;
  owner: string;
  facilities: {
    bathroom: boolean;
    wifi: boolean;
    bed: boolean;
    parking: boolean;
    kitchen: boolean;
    ac: boolean;
    tv: boolean;
    pool: boolean;
  };
  images: Array<{ url: string; publicId?: string; file?: File }>;
};

async function deleteBooking(id: string) {
  const response = await fetch(`/api/bookings/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete booking");
  }
  return response.json();
}

async function fetchBookings(): Promise<Book[]> {
  const response = await fetch("/api/bookings");
  if (!response.ok) {
    throw new Error("Failed to fetch bookings");
  }
  const data = await response.json();
  return data.data;
}

async function fetchVillas(): Promise<Villa[]> {
  const response = await fetch("/api/villas");
  if (!response.ok) {
    throw new Error("Failed to fetch villas");
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

function BookingsTable() {
  const [bookings, setBookings] = useState<Book[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user session and role
  const { data: session } = useAuth();
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsData, villasData] = await Promise.all([fetchBookings(), fetchVillas()]);

        setBookings(bookingsData);
        setVillas(villasData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data");
        setIsLoading(false);
      }
    };

    fetchData();

    // Clean up any pending timeouts when component unmounts
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const getVillaName = (villaId: string): string => {
    const villa = villas.find(v => v._id === villaId);
    return villa ? villa.name : "Unknown Villa";
  };

  const handleDelete = async (id: string) => {
    try {
      // Set the deleting ID to trigger the animation
      setDeletingId(id);

      // Wait for the animation to complete before actually removing from state
      animationTimeoutRef.current = setTimeout(async () => {
        // Call the API to delete the booking
        await deleteBooking(id);

        // Update the state to remove the booking
        setBookings(bookings.filter(booking => booking._id !== id));
        setDeletingId(null);

        // Show success message
        toast.success("Booking deleted successfully");
      }, 500); // Match this with the CSS transition duration
    } catch (error) {
      console.error("Error deleting booking:", error);
      setDeletingId(null);
      toast.error("Failed to delete booking");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors />
      <style jsx global>{`
        .booking-row {
          transition: all 0.5s ease;
        }
        
        .booking-row.deleting {
          opacity: 0;
          transform: translateX(10px);
          background-color: rgba(254, 202, 202, 0.2);
        }
      `}</style>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guest Name</TableHead>
            <TableHead>Villa Name</TableHead>
            <TableHead>Check-in Date</TableHead>
            <TableHead>Check-out Date</TableHead>
            <TableHead>Order ID</TableHead>
            <TableHead>Total Price</TableHead>
            <TableHead>Payment Status</TableHead>
            {isAdmin && <TableHead>Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-gray-500">
                No bookings found
              </TableCell>
            </TableRow>
          ) : (
            bookings.map(booking => (
              <TableRow key={booking._id} className={`booking-row ${deletingId === booking._id ? "deleting" : ""}`}>
                <TableCell>{booking.name}</TableCell>
                <TableCell>{getVillaName(booking.villaId)}</TableCell>
                <TableCell>{formatDate(booking.checkInDate)}</TableCell>
                <TableCell>{formatDate(booking.checkOutDate)}</TableCell>
                <TableCell>{booking.orderId}</TableCell>
                <TableCell>{formatToIDR(booking.amount)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                      booking.paymentStatus === "paid" || booking.paymentStatus === "confirmed"
                        ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                        : booking.paymentStatus === "cancelled"
                        ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
                        : "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20"
                    }`}
                  >
                    {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                  </span>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex space-x-2">
                      {/* <Link href={`/edit-booking/${booking._id}`}>
                        <Button variant="outline" size="icon" disabled={deletingId === booking._id}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link> */}
                      <Button variant="outline" size="icon" onClick={() => handleDelete(booking._id)} disabled={deletingId === booking._id} className={deletingId === booking._id ? "opacity-50 cursor-not-allowed" : ""}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}

export default BookingsTable;
