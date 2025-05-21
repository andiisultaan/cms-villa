"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Edit, Plus, Search, Trash2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import { toast, Toaster } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import Navigation from "@/components/navigation";
import { useAuth } from "@/components/auth-provider";
import { Input } from "@/components/ui/input";
import { EditEntryPanel } from "@/components/edit-entry-dialog";
import Link from "next/link";

// Define types based on API response
interface Booking {
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
  extraBed?: number;
  priceExtraBed?: number;
}

interface Villa {
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
  images: Array<{
    url: string;
    publicId: string;
  }>;
}

// Financial entry interface for the detailed report
interface FinancialEntry {
  id: string;
  dateIn: string;
  dateOut: string;
  visitorName: string;
  personInCharge: string;
  deposite: number;
  villa: string;
  capacity: number;
  extraBed: number;
  priceExtraBed: number;
  villaPrice: number;
  ownerShare: number;
  managerShare: number;
  notes: string;
  paymentStatus: string;
}

interface ApiResponse<T> {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
}

export default function FinancialReportPage() {
  // Get user from auth context with fallback for when it's undefined
  const { data: session } = useAuth();
  const user = session?.user;
  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "staff";

  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date(), // Today
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [villaMap, setVillaMap] = useState<Record<string, Villa>>({});
  const [summaryData, setSummaryData] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    averageBookingValue: 0,
    occupancyRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("detailed-financial");

  // Financial report specific states
  const [financialData, setFinancialData] = useState<FinancialEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Filter financial data based on search term
  const filteredFinancialData = financialData.filter(
    entry => entry.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) || entry.villa.toLowerCase().includes(searchTerm.toLowerCase()) || entry.notes.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate financial totals
  const financialTotals = financialData.reduce(
    (acc, entry) => {
      // Only include entries with paid status in the totals
      const isPaid = entry.paymentStatus === "paid";

      if (isPaid) {
        return {
          deposite: acc.deposite + entry.deposite,
          extraBed: acc.extraBed + entry.extraBed,
          priceExtraBed: acc.priceExtraBed + entry.priceExtraBed,
          villaPrice: acc.villaPrice + entry.villaPrice,
          ownerShare: acc.ownerShare + entry.ownerShare,
          managerShare: acc.managerShare + entry.managerShare,
        };
      }

      // Return accumulator unchanged for unpaid entries
      return acc;
    },
    {
      deposite: 0,
      extraBed: 0,
      priceExtraBed: 0,
      villaPrice: 0,
      ownerShare: 0,
      managerShare: 0,
    }
  );

  // Handle deleting a financial entry
  const handleDeleteEntry = async (id: string) => {
    try {
      // Find the entry to be deleted
      const entryToDelete = financialData.find(entry => entry.id === id);

      if (!entryToDelete) {
        toast.error("Entry not found");
        return;
      }

      // Find the original booking that corresponds to this entry
      const originalBooking = bookings.find(booking => {
        // Match by order ID which is stored in notes
        return booking.orderId === entryToDelete.notes;
      });

      if (!originalBooking) {
        toast.error("Could not find corresponding booking");
        return;
      }

      // Send DELETE request to the API
      const bookingId = originalBooking._id;
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete booking");
      }

      // Update local state by removing the deleted entry
      setFinancialData(financialData.filter(entry => entry.id !== id));

      // Show success message
      toast.success("Entry deleted successfully");
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete entry");
    }
  };

  const handleEditEntry = (id: string) => {
    const entry = financialData.find(entry => entry.id === id);
    if (entry) {
      setEditingEntry(entry);
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveEntry = async (updatedEntry: FinancialEntry) => {
    try {
      // Find the original booking that corresponds to this entry
      const originalBooking = bookings.find(booking => {
        // Match by order ID which is stored in notes
        return booking.orderId === updatedEntry.notes;
      });

      if (!originalBooking) {
        toast.error("Could not find corresponding booking");
        return;
      }

      // Prepare data for API request - only updating extraBed fields
      const bookingId = originalBooking._id;
      const updateData = {
        extraBed: updatedEntry.extraBed,
        priceExtraBed: updatedEntry.priceExtraBed,
      };

      // Send PATCH request to update the booking
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update booking");
      }

      // Update local state
      setFinancialData(financialData.map(entry => (entry.id === updatedEntry.id ? updatedEntry : entry)));

      // Close dialog and show success message
      setIsEditDialogOpen(false);
      toast.success("Extra bed information updated successfully");
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update extra bed information");
    }
  };

  // Generate financial data from bookings and villas
  const generateFinancialData = (bookings: Booking[], villas: Record<string, Villa>): FinancialEntry[] => {
    return bookings.map((booking, index) => {
      const villa = villas[booking.villaId];

      // Calculate shares based on amount (60% owner, 40% manager)
      const villaPrice = booking.amount;
      const ownerShare = Math.round(villaPrice * 0.6);
      const managerShare = Math.round(villaPrice * 0.4);

      // Default values for missing data
      const capacity = booking?.guests;
      const villaName = villa?.name || "Unknown Villa";

      // Check for extraBed and priceExtraBed in booking data
      const extraBed = (booking as any).extraBed || 0;
      const priceExtraBed = (booking as any).priceExtraBed || 0;

      return {
        id: (index + 1).toString(),
        dateIn: booking.checkInDate,
        dateOut: booking.checkOutDate,
        visitorName: booking.name,
        personInCharge: booking.name,
        deposite: booking.amount,
        villa: villaName,
        capacity: capacity,
        extraBed: extraBed,
        priceExtraBed: priceExtraBed,
        villaPrice: villaPrice,
        ownerShare: ownerShare,
        managerShare: managerShare,
        notes: booking.orderId,
        paymentStatus: booking.paymentStatus,
      };
    });
  };

  // Fetch bookings and villas data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch bookings
        const bookingsResponse = await fetch("/api/bookings");
        if (!bookingsResponse.ok) {
          throw new Error("Failed to fetch bookings");
        }
        const bookingsData: ApiResponse<Booking[]> = await bookingsResponse.json();

        // Fetch villas
        const villasResponse = await fetch("/api/villas");
        if (!villasResponse.ok) {
          throw new Error("Failed to fetch villas");
        }
        const villasData: ApiResponse<Villa[]> = await villasResponse.json();

        if (bookingsData.data && villasData.data) {
          const bookingsArray = bookingsData.data || [];
          const villasArray = villasData.data || [];

          setBookings(bookingsArray);
          setVillas(villasArray);

          // Create villa map for quick lookup
          const map: Record<string, Villa> = {};
          villasArray.forEach(villa => {
            map[villa._id] = villa;
          });
          setVillaMap(map);

          // Generate financial data from bookings and villas
          const generatedFinancialData = generateFinancialData(bookingsArray, map);
          setFinancialData(generatedFinancialData);
        } else {
          // Set empty arrays if no data
          setBookings([]);
          setVillas([]);
          setFinancialData([]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");

        // Set empty arrays on error
        setBookings([]);
        setVillas([]);
        setFinancialData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter bookings based on date range
  useEffect(() => {
    if (!date?.from || !date?.to || bookings.length === 0) return;

    const filtered = bookings.filter(booking => {
      const checkIn = new Date(booking.checkInDate);
      return checkIn >= date.from! && checkIn <= date.to!;
    });

    setFilteredBookings(filtered);

    // Calculate summary data
    const totalRevenue = filtered.reduce((sum, booking) => sum + booking.amount, 0);
    const totalBookings = filtered.length;
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Simple occupancy calculation
    const dateRange = date.to!.getTime() - date.from!.getTime();
    const days = Math.ceil(dateRange / (1000 * 60 * 60 * 24)) + 1;
    const totalPossibleBookingDays = days * villas.length;

    // Count actual booking days
    let bookedDays = 0;
    filtered.forEach(booking => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      const bookingDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      bookedDays += bookingDays;
    });

    const occupancyRate = totalPossibleBookingDays > 0 ? (bookedDays / totalPossibleBookingDays) * 100 : 0;

    setSummaryData({
      totalRevenue,
      totalBookings,
      averageBookingValue,
      occupancyRate,
    });

    // Update financial data based on filtered bookings
    const updatedFinancialData = generateFinancialData(filtered, villaMap);
    setFinancialData(updatedFinancialData);
  }, [date, bookings, villas, villaMap]);

  // Group bookings by villa
  const bookingsByVilla: Record<string, Booking[]> = {};
  filteredBookings.forEach(booking => {
    if (!bookingsByVilla[booking.villaId]) {
      bookingsByVilla[booking.villaId] = [];
    }
    bookingsByVilla[booking.villaId].push(booking);
  });

  // Calculate villa-specific summaries with proper null checks
  const villaSummaries = Object.keys(bookingsByVilla)
    .filter(villaId => {
      // If user is undefined or null, show all villas (default to admin view)
      if (!user) return true;

      // If user is admin, show all villas
      if (user.role === "admin") return true;

      // If user is owner, only show their villas
      if (user.role === "owner") {
        return villaMap[villaId]?.owner === user.name;
      }

      return false;
    })
    .map(villaId => {
      const villaBookings = bookingsByVilla[villaId];
      const totalRevenue = villaBookings.reduce((sum, booking) => sum + booking.amount, 0);
      const totalBookings = villaBookings.length;

      return {
        villaId,
        villaName: villaMap[villaId]?.name || "Unknown Villa",
        totalRevenue,
        totalBookings,
        averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0,
      };
    });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd MMM yyyy");
  };

  const handleExport = () => {
    try {
      // Initialize PDF document
      // Adjust the page orientation and margins
      const doc = new jsPDF("landscape", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10; // Reduced from 15 to give more space for the table
      const primaryColor = [50, 50, 50];
      const secondaryColor = [100, 100, 100];
      const accentColor = [0, 100, 200];

      // ==================== HEADER SECTION ====================
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, pageWidth, margin * 2, "F");

      // Main title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(getReportTitle(), pageWidth / 2, margin, { align: "center" });

      // Date range
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      const dateRangeText = `Periode: ${date?.from ? format(date.from, "dd MMMM yyyy") : ""} - ${date?.to ? format(date.to, "dd MMMM yyyy") : ""}`;
      doc.text(dateRangeText, pageWidth / 2, margin + 7, { align: "center" });

      // ==================== SUMMARY SECTION ====================
      const summaryStartY = margin * 2 + 5;
      const summaryHeight = 35; // Slightly taller

      // Summary box with rounded corners and subtle shadow effect
      doc.setFillColor(250, 250, 255);
      doc.roundedRect(margin, summaryStartY, pageWidth - margin * 2, summaryHeight, 5, 5, "F");
      doc.setDrawColor(210, 210, 230);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, summaryStartY, pageWidth - margin * 2, summaryHeight, 5, 5, "S");

      // Add subtle shadow effect
      doc.setDrawColor(230, 230, 240);
      doc.setLineWidth(0.1);
      for (let i = 1; i <= 3; i++) {
        doc.roundedRect(margin + i * 0.3, summaryStartY + i * 0.3, pageWidth - margin * 2, summaryHeight, 5, 5, "S");
      }

      // Summary title with accent bar
      doc.setFillColor(70, 70, 100);
      doc.rect(margin + 5, summaryStartY + 5, 3, 10, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(70, 70, 100);
      doc.text("Ringkasan Laporan", margin + 15, summaryStartY + 10);

      // Summary grid layout
      const gridConfig = {
        cols: 2,
        rows: 2,
        padding: 5,
        startX: margin + 10,
        startY: summaryStartY + 18,
        colWidth: (pageWidth - margin * 2 - 20) / 2,
        rowHeight: 9,
      };

      // Summary data
      const summaryItems = [
        { label: "Total Pendapatan:", value: formatCurrency(financialTotals.deposite) },
        { label: "Jumlah Booking:", value: summaryData.totalBookings.toString() },
        { label: "Rata-rata Nilai Booking:", value: formatCurrency(summaryData.averageBookingValue) },
        { label: "Tingkat Okupansi:", value: `${summaryData.occupancyRate.toFixed(1)}%` },
      ];

      // Draw summary grid
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 100);

      summaryItems.forEach((item, index) => {
        const col = index % gridConfig.cols;
        const row = Math.floor(index / gridConfig.cols);
        const x = gridConfig.startX + col * gridConfig.colWidth;
        const y = gridConfig.startY + row * gridConfig.rowHeight;

        doc.text(item.label, x, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 80);
        doc.text(item.value, x + 45, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 100);
      });

      // ==================== TABLE SECTION ====================
      const tableHeaderY = summaryStartY + summaryHeight + 10;

      // Table title
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Laporan Keuangan Detail", margin, tableHeaderY);

      // Table note
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text("*Hanya transaksi dengan status LUNAS yang dihitung dalam total", pageWidth - margin, tableHeaderY, {
        align: "right",
      });

      // Table columns configuration
      // Modify the table columns configuration to better fit the page width
      const tableColumns = [
        { header: "NO", dataKey: "id", width: 8, align: "center" },
        {
          header: "Hari / Tanggal",
          subHeaders: ["IN", "OUT"],
          dataKeys: ["dateIn", "dateOut"],
          width: 25, // Reduced width
          align: "left",
        },
        { header: "Nama Pengunjung", dataKey: "visitorName", width: 25, align: "left" }, // Reduced width
        { header: "Pembookingan", dataKey: "deposite", width: 22, align: "right" }, // Reduced width
        { header: "Villa", dataKey: "villa", width: 20, align: "left" }, // Reduced width
        { header: "Jumlah Tamu", dataKey: "capacity", width: 15, align: "center" }, // Reduced width
        { header: "Extra Bed", dataKey: "extraBed", width: 15, align: "center" }, // Reduced width
        { header: "Price Extra Bed", dataKey: "priceExtraBed", width: 22, align: "right" }, // Reduced width
        { header: "Harga Villa", dataKey: "villaPrice", width: 22, align: "right" }, // Reduced width
        {
          header: "Pembagian",
          subHeaders: ["60% Pemilik", "40% Pengelola"],
          dataKeys: ["ownerShare", "managerShare"],
          width: 35, // Reduced width
          align: "right",
        },
        { header: "Status Pembayaran", dataKey: "status", width: 20, align: "center" }, // Reduced width
        { header: "Order ID", dataKey: "notes", width: 28, align: "left" }, // Adjusted to ensure visibility
      ];

      // Prepare table data
      const tableData = filteredFinancialData.map((entry, index) => ({
        id: (index + 1).toString(),
        dateIn: new Date(entry.dateIn).toLocaleDateString("id-ID"),
        dateOut: new Date(entry.dateOut).toLocaleDateString("id-ID"),
        visitorName: entry.visitorName,
        villa: entry.villa,
        capacity: entry.capacity.toString(),
        extraBed: entry.extraBed.toString(),
        priceExtraBed: formatCurrency(entry.priceExtraBed),
        deposite: formatCurrency(entry.deposite),
        villaPrice: formatCurrency(entry.villaPrice),
        ownerShare: formatCurrency(entry.ownerShare),
        managerShare: formatCurrency(entry.managerShare),
        status: entry.paymentStatus === "paid" ? "Lunas" : "Belum Lunas",
        notes: entry.notes,
      }));

      // Table drawing parameters
      const tableStartY = tableHeaderY + 10;
      const rowHeight = 8;
      const maxRowsPerPage = Math.floor((pageHeight - tableStartY - margin * 2) / rowHeight);
      let currentPage = 1;
      let currentY = tableStartY;

      // Draw table function
      // Adjust the header drawing function for better fit
      const drawTableHeader = () => {
        // Header background - using a nicer gradient effect
        const gradient = doc.setFillColor(240, 240, 245);
        doc.rect(margin, currentY, pageWidth - margin * 2, 12, "F");

        // Border styling
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.rect(margin, currentY, pageWidth - margin * 2, 12, "S");

        // Header text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7); // Reduced font size for headers
        doc.setTextColor(50, 50, 80); // Darker blue-gray for better contrast

        let currentX = margin;

        // First draw all header text
        tableColumns.forEach(column => {
          if (column.subHeaders) {
            // Main header
            doc.text(column.header, currentX + column.width / 2, currentY + 5, { align: "center" });
          } else {
            // Regular header
            doc.text(column.header, currentX + column.width / 2, currentY + 7, { align: "center" });
          }
          currentX += column.width;
        });

        // Draw subheaders text
        currentX = margin;
        tableColumns.forEach(column => {
          if (column.subHeaders) {
            const subWidth = column.width / column.subHeaders.length;

            column.subHeaders.forEach((subHeader, idx) => {
              const subX = currentX + subWidth * idx + subWidth / 2;
              doc.text(subHeader, subX, currentY + 10, { align: "center" });
            });
          }
          currentX += column.width;
        });

        // Then draw all vertical borders separately
        currentX = margin;
        tableColumns.forEach((column, index) => {
          // Vertical border - thinner lines
          doc.setLineWidth(0.1);

          // Only draw prominent vertical lines at main column boundaries
          if (index === 0 || column.subHeaders) {
            doc.setDrawColor(180, 180, 180);
          } else {
            doc.setDrawColor(220, 220, 220); // Lighter color for internal borders
          }

          doc.line(currentX, currentY, currentX, currentY + 12);

          // Draw internal subheader dividers if needed
          if (column.subHeaders) {
            const subWidth = column.width / column.subHeaders.length;

            for (let i = 1; i < column.subHeaders.length; i++) {
              doc.setDrawColor(220, 220, 220); // Lighter color for subheader dividers
              doc.line(currentX + subWidth * i, currentY + 6, currentX + subWidth * i, currentY + 12);
            }
          }

          currentX += column.width;
        });

        // Final vertical border
        doc.setDrawColor(180, 180, 180);
        doc.line(currentX, currentY, currentX, currentY + 12);

        // Horizontal divider for subheaders
        doc.setLineWidth(0.2);
        doc.line(margin, currentY + 6, pageWidth - margin, currentY + 6);

        currentY += 12;
      };

      // Draw table rows function
      // Modify the drawTableRows function to handle text overflow
      const drawTableRows = (rows: typeof tableData) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5); // Reduced font size to fit more text
        doc.setTextColor(60, 60, 60);

        rows.forEach((row, rowIndex) => {
          // Alternate row background - more subtle
          if (rowIndex % 2 === 0) {
            doc.setFillColor(248, 248, 252);
            doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, "F");
          }

          let currentX = margin;

          // First draw all cell content
          tableColumns.forEach(column => {
            // Handle cell content
            if (column.subHeaders) {
              // Subheader columns
              const subWidth = column.width / column.subHeaders.length;

              column.dataKeys.forEach((dataKey, idx) => {
                const cellX = currentX + subWidth * idx;
                const align = column.align || "left";
                // Add more padding to prevent text from touching borders
                const xPos = align === "right" ? cellX + subWidth - 3 : align === "center" ? cellX + subWidth / 2 : cellX + 3;

                // Truncate text if needed
                const text = (row as any)[dataKey].toString();
                doc.text(text, xPos, currentY + 5, {
                  align: align as "left" | "center" | "right" | "justify" | undefined,
                });
              });
            } else {
              // Regular columns
              const align = column.align || "left";
              // Add more padding to prevent text from touching borders
              const xPos = align === "right" ? currentX + column.width - 3 : align === "center" ? currentX + column.width / 2 : currentX + 3;

              // Special styling for status column
              if (column.dataKey === "status") {
                if (row.status === "Lunas") {
                  doc.setTextColor(0, 128, 0); // Green for paid
                } else {
                  doc.setTextColor(220, 100, 0); // Orange for unpaid
                }
                // Add a subtle background for status
                const statusBgColor = row.status === "Lunas" ? [240, 250, 240] : [250, 245, 235];
                doc.setFillColor(statusBgColor[0], statusBgColor[1], statusBgColor[2]);
                doc.rect(currentX + 1, currentY + 1, column.width - 2, rowHeight - 2, "F");
              }

              // For Order ID column, ensure it's fully visible
              if (column.dataKey === "notes") {
                doc.setTextColor(50, 50, 100); // Make Order ID more visible
              }

              const text = (row as any)[column.dataKey].toString();
              doc.text(text, xPos, currentY + 5, {
                align: align as "left" | "center" | "right" | "justify" | undefined,
              });

              // Reset text color
              if (column.dataKey === "status" || column.dataKey === "notes") {
                doc.setTextColor(60, 60, 60);
              }
            }

            currentX += column.width;
          });

          // Then draw all borders separately to avoid overlapping with text
          currentX = margin;
          tableColumns.forEach(column => {
            // Draw cell border - lighter, thinner borders
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.1);

            // Only draw horizontal lines and vertical lines at column edges
            if (rowIndex === rows.length - 1) {
              // Bottom border for last row
              doc.line(currentX, currentY + rowHeight, currentX + column.width, currentY + rowHeight);
            }

            // Vertical borders - only draw at the start of each column, not at the end
            if (column === tableColumns[0] || column.subHeaders) {
              doc.line(currentX, currentY, currentX, currentY + rowHeight);
            } else {
              // For other columns, draw a very light line
              doc.setDrawColor(240, 240, 240);
              doc.line(currentX, currentY, currentX, currentY + rowHeight);
            }

            // Draw the final vertical border at the end of the last column
            if (column === tableColumns[tableColumns.length - 1]) {
              doc.setDrawColor(230, 230, 230);
              doc.line(currentX + column.width, currentY, currentX + column.width, currentY + rowHeight);
            }

            currentX += column.width;
          });

          currentY += rowHeight;
        });
      };

      // Draw table for current page
      const drawTablePage = (rows: typeof tableData, isFirstPage: boolean) => {
        if (!isFirstPage) {
          doc.addPage();
          currentPage++;
          currentY = margin + 15;

          // Page header
          doc.setFillColor(240, 240, 240);
          doc.rect(0, 0, pageWidth, margin * 2, "F");
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text(`${getReportTitle()} - Halaman ${currentPage}`, pageWidth / 2, margin, { align: "center" });

          // Date range
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
          doc.text(dateRangeText, pageWidth / 2, margin + 7, { align: "center" });

          currentY += 10;
        }

        drawTableHeader();
        drawTableRows(rows);
      };

      // Paginate and draw table
      for (let i = 0; i < tableData.length; i += maxRowsPerPage) {
        const pageRows = tableData.slice(i, i + maxRowsPerPage);
        drawTablePage(pageRows, i === 0);
      }

      // ==================== TOTALS ROW ====================
      doc.setFillColor(240, 240, 250); // Lighter blue-gray background
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight + 4, "F");
      doc.setDrawColor(180, 180, 200);
      doc.setLineWidth(0.3); // Slightly thicker border for emphasis
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight + 4, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5); // Slightly larger font
      doc.setTextColor(50, 50, 100); // Darker blue for emphasis

      // Draw "Total" label
      doc.text("Total", margin + 10, currentY + 6, { align: "left" });

      // Calculate total values positions
      let totalX = margin;

      // Skip NO, Hari/Tanggal, and Nama Pengunjung columns
      totalX += tableColumns[0].width + tableColumns[1].width + tableColumns[2].width;

      // Deposite total
      doc.text(formatCurrency(financialTotals.deposite), totalX + tableColumns[3].width - 2, currentY + 6, {
        align: "right",
      });
      totalX += tableColumns[3].width;

      // Skip Villa and Jumlah Tamu columns
      totalX += tableColumns[4].width + tableColumns[5].width;

      // Extra Bed total
      doc.text(financialTotals.extraBed.toString(), totalX + tableColumns[6].width / 2, currentY + 6, {
        align: "center",
      });
      totalX += tableColumns[6].width;

      // Price Extra Bed total
      doc.text(formatCurrency(financialTotals.priceExtraBed), totalX + tableColumns[7].width - 2, currentY + 6, {
        align: "right",
      });
      totalX += tableColumns[7].width;

      // Villa Price total
      doc.text(formatCurrency(financialTotals.villaPrice), totalX + tableColumns[8].width - 2, currentY + 6, {
        align: "right",
      });
      totalX += tableColumns[8].width;

      // Pembagian totals
      const pembagianWidth = tableColumns[9].width / 2;
      doc.text(formatCurrency(financialTotals.ownerShare), totalX + pembagianWidth - 2, currentY + 6, {
        align: "right",
      });
      doc.text(formatCurrency(financialTotals.managerShare), totalX + pembagianWidth * 2 - 2, currentY + 6, {
        align: "right",
      });

      // ==================== FOOTER SECTION ====================
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text(`Dicetak pada: ${format(new Date(), "dd MMMM yyyy HH:mm")}`, margin, footerY);
      doc.text(`Halaman ${currentPage}`, pageWidth - margin, footerY, { align: "right" });

      // Save the PDF
      const fileName = `laporan-keuangan-${date?.from ? format(date.from, "dd-MM-yyyy") : ""}-${date?.to ? format(date.to, "dd-MM-yyyy") : ""}.pdf`;
      doc.save(fileName);

      toast.success("Laporan berhasil diexport ke PDF");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Gagal mengexport laporan ke PDF");
    }
  };

  // Add a title based on user role with null check
  const getReportTitle = () => {
    if (user?.role === "owner") {
      return "Laporan Keuangan Villa Anda";
    }
    return "Laporan Keuangan Villa";
  };

  const printInvoice = (entry: FinancialEntry) => {
    try {
      // Initialize PDF document
      const doc = new jsPDF("portrait", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // ==================== HEADER SECTION ====================
      doc.setFillColor(245, 245, 255);
      doc.rect(0, 0, pageWidth, 40, "F");

      // Invoice title
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 100);
      doc.text("INVOICE", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Villa Booking Receipt", pageWidth / 2, 30, { align: "center" });

      // ==================== CUSTOMER INFO SECTION ====================
      const infoStartY = 50;

      // Left side - Customer details
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Customer Details:", margin, infoStartY);

      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${entry.visitorName}`, margin, infoStartY + 8);
      doc.text(`Order ID: ${entry.notes}`, margin, infoStartY + 16);

      // Right side - Booking details
      doc.setFont("helvetica", "bold");
      doc.text("Booking Details:", pageWidth - margin - 60, infoStartY);

      doc.setFont("helvetica", "normal");
      doc.text(`Check-in: ${formatDate(entry.dateIn)}`, pageWidth - margin - 60, infoStartY + 8);
      doc.text(`Check-out: ${formatDate(entry.dateOut)}`, pageWidth - margin - 60, infoStartY + 16);
      doc.text(`Villa: ${entry.villa}`, pageWidth - margin - 60, infoStartY + 24);

      // ==================== INVOICE DETAILS SECTION ====================
      const tableStartY = infoStartY + 40;

      // Table header
      doc.setFillColor(240, 240, 250);
      doc.rect(margin, tableStartY, pageWidth - margin * 2, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Description", margin + 5, tableStartY + 7);
      doc.text("Qty", pageWidth - margin - 90, tableStartY + 7);
      // doc.text("Price", pageWidth - margin - 60, tableStartY + 7);
      doc.text("Price", pageWidth - margin - 20, tableStartY + 7, { align: "right" });

      // Table rows
      let currentY = tableStartY + 15;

      // Villa booking row
      doc.setFont("helvetica", "normal");
      doc.text(`Villa Booking (${entry.villa})`, margin + 5, currentY);
      doc.text("1", pageWidth - margin - 90, currentY);
      // doc.text(formatCurrency(entry.villaPrice), pageWidth - margin - 60, currentY);
      doc.text(formatCurrency(entry.villaPrice), pageWidth - margin - 20, currentY, { align: "right" });

      currentY += 10;

      // Extra bed row (if applicable)
      if (entry.extraBed > 0) {
        doc.text("Extra Bed", margin + 5, currentY);
        doc.text(entry.extraBed.toString(), pageWidth - margin - 90, currentY);
        // doc.text(formatCurrency(entry.priceExtraBed / entry.extraBed), pageWidth - margin - 60, currentY);
        doc.text(formatCurrency(entry.priceExtraBed), pageWidth - margin - 20, currentY, { align: "right" });
        currentY += 10;
      }

      // Divider line
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY, pageWidth - margin, currentY);

      currentY += 10;

      // Calculate total (villa price + extra bed cost)
      const totalAmount = entry.villaPrice + entry.priceExtraBed;

      // Total
      doc.setFont("helvetica", "bold");
      doc.text("Total", pageWidth - margin - 60, currentY);
      doc.text(formatCurrency(totalAmount), pageWidth - margin - 20, currentY, { align: "right" });

      // Payment status
      currentY += 20;
      doc.setFontSize(12);

      if (entry.paymentStatus === "paid") {
        doc.setTextColor(0, 120, 0);
        doc.text("PAID", pageWidth - margin - 20, currentY, { align: "right" });
      } else {
        doc.setTextColor(200, 80, 0);
        doc.text("UNPAID", pageWidth - margin - 20, currentY, { align: "right" });
      }

      // ==================== FOOTER SECTION ====================
      const footerY = pageHeight - 30;

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("Thank you for your booking!", pageWidth / 2, footerY, { align: "center" });
      doc.text(`Generated on: ${format(new Date(), "dd MMMM yyyy HH:mm")}`, pageWidth / 2, footerY + 7, {
        align: "center",
      });

      // Save the PDF
      const fileName = `invoice-${entry.villa}-${entry.notes}.pdf`;
      doc.save(fileName);

      toast.success("Invoice berhasil dicetak");
    } catch (error) {
      console.error("Error printing invoice:", error);
      toast.error("Gagal mencetak invoice");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-200">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">{getReportTitle()}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-[150px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-[100px]" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">{getReportTitle()}</h1>
        <Card className="bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-200">
      <Navigation />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="container mx-auto py-10">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{getReportTitle()}</h1>
          </div>

          {/* Date Range Picker */}
          <div className="mb-6 no-print">
            <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "PPP")} - {format(date.to, "PPP")}
                      </>
                    ) : (
                      format(date.from, "PPP")
                    )
                  ) : (
                    <span>Pilih rentang tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CustomCalendar mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} className="border-none" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Printable content */}
          <div ref={printRef}>
            {/* Print header - only visible when printing */}
            <div className="hidden print:block mb-8">
              <h1 className="text-2xl font-bold text-center">{getReportTitle()}</h1>
              <p className="text-center text-gray-600 mt-2">
                Periode: {date?.from ? format(date.from, "dd MMMM yyyy") : ""} - {date?.to ? format(date.to, "dd MMMM yyyy") : ""}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.totalRevenue)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Jumlah Booking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData.totalBookings}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Rata-rata Nilai Booking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.averageBookingValue)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Tingkat Okupansi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData.occupancyRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="detailed-financial" className="no-print" onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="detailed-financial">Laporan Keuangan Detail</TabsTrigger>
                {(user?.role === "admin" || user?.role === "owner") && <TabsTrigger value="by-villa">Laporan Per Villa</TabsTrigger>}
              </TabsList>

              <TabsContent value="by-villa">
                {user?.role === "admin" || user?.role === "owner" ? (
                  <div className="grid gap-6">
                    {/* Villa Summary Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Ringkasan Per Villa</CardTitle>
                        <CardDescription>Pendapatan dan jumlah booking per villa</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Villa</TableHead>
                              <TableHead>Jumlah Booking</TableHead>
                              <TableHead className="text-right">Total Pendapatan</TableHead>
                              <TableHead className="text-right">Rata-rata Per Booking</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {villaSummaries.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center">
                                  Tidak ada data booking dalam periode ini
                                </TableCell>
                              </TableRow>
                            ) : (
                              villaSummaries.map(summary => (
                                <TableRow key={summary.villaId}>
                                  <TableCell className="font-medium">{summary.villaName}</TableCell>
                                  <TableCell>{summary.totalBookings}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(summary.totalRevenue)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(summary.averageBookingValue)}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Individual Villa Reports */}
                    {villaSummaries.map(summary => (
                      <Card key={summary.villaId}>
                        <CardHeader>
                          <CardTitle>{summary.villaName}</CardTitle>
                          <CardDescription>Detail booking untuk {summary.villaName}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Tamu</TableHead>
                                <TableHead>Check In</TableHead>
                                <TableHead>Check Out</TableHead>
                                <TableHead>Total Tamu</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bookingsByVilla[summary.villaId].map(booking => (
                                <TableRow key={booking._id}>
                                  <TableCell className="font-medium">{booking.orderId}</TableCell>
                                  <TableCell>{booking.name}</TableCell>
                                  <TableCell>{formatDate(booking.checkInDate)}</TableCell>
                                  <TableCell>{formatDate(booking.checkOutDate)}</TableCell>
                                  <TableCell>{booking.guests}</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${booking.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                      {booking.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(booking.amount)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <tfoot className="border-t">
                              <tr>
                                <td colSpan={6} className="text-right font-medium py-4">
                                  Total:
                                </td>
                                <td className="text-right font-medium py-4">{formatCurrency(summary.totalRevenue)}</td>
                              </tr>
                            </tfoot>
                            <TableCaption className="sr-only">Total: {formatCurrency(summary.totalRevenue)}</TableCaption>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-amber-600">Anda tidak memiliki akses untuk melihat laporan per villa.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Detailed Financial Report Tab */}
              <TabsContent value="detailed-financial">
                <Card>
                  <CardHeader>
                    <CardTitle>Laporan Keuangan Detail</CardTitle>
                    <CardDescription>
                      Laporan keuangan detail villa dalam periode {date?.from && format(date.from, "PPP")} - {date?.to && format(date.to, "PPP")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Cari..." className="pl-8 w-full sm:w-[250px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                      </div>
                      <div className="flex gap-2 ml-auto">
                        <Link href="/add-booking" className="flex items-center">
                          <Button variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            <span>Tambah Booking</span>
                          </Button>
                        </Link>
                        <Button variant="outline" onClick={handleExport}>
                          <Download className="h-4 w-4 mr-2" />
                          <span>Export PDF</span>
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <Table className="border">
                        <TableHeader className="bg-muted">
                          <TableRow>
                            <TableHead rowSpan={2} className="border text-center">
                              NO
                            </TableHead>
                            <TableHead colSpan={2} className="border text-center">
                              Hari / Tanggal
                            </TableHead>
                            <TableHead rowSpan={2} className="border text-center">
                              Nama Pengunjung
                            </TableHead>
                            <TableHead rowSpan={2} className="border text-center">
                              Pembookingan
                            </TableHead>
                            <TableHead rowSpan={2} className="border text-center">
                              Villa
                            </TableHead>
                            <TableHead rowSpan={2} className="border text-center">
                              Jumlah Tamu
                            </TableHead>
                            <TableHead rowSpan={2} className="border text-center">
                              Extra Bed
                            </TableHead>
                            <TableHead rowSpan={2} className="border text-center">
                              Price Extra Bed
                            </TableHead>
                            <TableHead rowSpan={2} className="border text-center">
                              Harga Villa
                            </TableHead>
                            <TableHead colSpan={2} className="border text-center">
                              Pembagian
                            </TableHead>
                            <TableHead rowSpan={2} className="border text-center">
                              Status Pembayaran
                            </TableHead>
                            <TableHead rowSpan={2} className="border text-center">
                              Order ID
                            </TableHead>
                            {isAdmin && (
                              <TableHead rowSpan={2} className="border text-center">
                                Actions
                              </TableHead>
                            )}
                          </TableRow>
                          <TableRow>
                            <TableHead className="border text-center">IN</TableHead>
                            <TableHead className="border text-center">OUT</TableHead>
                            <TableHead className="border text-center">60% Pemilik</TableHead>
                            <TableHead className="border text-center">40% Pengelola</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFinancialData.length > 0 ? (
                            filteredFinancialData.map((entry, index) => (
                              <TableRow key={entry.id}>
                                <TableCell className="border text-center">{index + 1}</TableCell>
                                <TableCell className="border text-center">{new Date(entry.dateIn).toLocaleDateString("id-ID")}</TableCell>
                                <TableCell className="border text-center">{new Date(entry.dateOut).toLocaleDateString("id-ID")}</TableCell>
                                <TableCell className="border">{entry.personInCharge}</TableCell>
                                <TableCell className="border text-right">{formatCurrency(entry.deposite)}</TableCell>
                                <TableCell className="border">{entry.villa}</TableCell>
                                <TableCell className="border text-center">{entry.capacity}</TableCell>
                                <TableCell className="border text-center">{entry.extraBed}</TableCell>
                                <TableCell className="border text-right">{formatCurrency(entry.priceExtraBed)}</TableCell>
                                <TableCell className="border text-right">{formatCurrency(entry.villaPrice)}</TableCell>
                                <TableCell className="border text-right">{formatCurrency(entry.ownerShare)}</TableCell>
                                <TableCell className="border text-right">{formatCurrency(entry.managerShare)}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs ${entry.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                    {entry.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                                  </span>
                                </TableCell>
                                <TableCell className="border">{entry.notes}</TableCell>
                                {isAdmin && (
                                  <>
                                    <TableCell className="border">
                                      <div className="flex space-x-1">
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteEntry(entry.id)}>
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Delete</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-primary" onClick={() => handleEditEntry(entry.id)}>
                                          <Edit className="h-4 w-4" />
                                          <span className="sr-only">Edit</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-blue-600" onClick={() => printInvoice(entry)}>
                                          <Download className="h-4 w-4" />
                                          <span className="sr-only">Print Invoice</span>
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={20} className="h-24 text-center">
                                Tidak ada data ditemukan.
                              </TableCell>
                            </TableRow>
                          )}
                          {/* Totals row */}
                          <TableRow className="bg-muted/50 font-medium">
                            <TableCell colSpan={4} className="border text-right">
                              Total
                            </TableCell>
                            <TableCell className="border text-right">{formatCurrency(financialTotals.deposite)}</TableCell>
                            <TableCell colSpan={3} className="border"></TableCell>
                            <TableCell className="border text-right">{formatCurrency(financialTotals.priceExtraBed)}</TableCell>
                            <TableCell className="border text-right">{formatCurrency(financialTotals.villaPrice)}</TableCell>
                            <TableCell className="border text-right">{formatCurrency(financialTotals.ownerShare)}</TableCell>
                            <TableCell className="border text-right">{formatCurrency(financialTotals.managerShare)}</TableCell>
                            <TableCell colSpan={3} className="border"></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          <EditEntryPanel entry={editingEntry} open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} onSave={handleSaveEntry} villas={villas} />
          <Toaster />
        </div>
      </main>
    </div>
  );
}
