"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Edit, Search, Trash2 } from "lucide-react";
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
  const isAdmin = session?.user?.role === "admin";

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
  const handleDeleteEntry = (id: string) => {
    setFinancialData(financialData.filter(entry => entry.id !== id));
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
      // Create a new PDF document
      const doc = new jsPDF("landscape", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15; // Increased margin for better spacing

      // Add title with better styling
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, pageWidth, margin * 2, "F");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(getReportTitle(), pageWidth / 2, margin, { align: "center" });

      // Add date range with better styling
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const dateRangeText = `Periode: ${date?.from ? format(date.from, "dd MMMM yyyy") : ""} - ${date?.to ? format(date.to, "dd MMMM yyyy") : ""}`;
      doc.text(dateRangeText, pageWidth / 2, margin + 7, { align: "center" });

      // Add summary data in a box
      const summaryStartY = margin * 2 + 5;
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(margin, summaryStartY, pageWidth - margin * 2, 30, 3, 3, "F");

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("Ringkasan Laporan", margin + 5, summaryStartY + 8);

      // Create a 2x2 grid for summary data
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);

      const col1X = margin + 10;
      const col2X = pageWidth / 2;

      // Row 1
      doc.text("Total Pendapatan:", col1X, summaryStartY + 16);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(financialTotals.deposite), col1X + 40, summaryStartY + 16);
      doc.setFont("helvetica", "normal");

      doc.text("Jumlah Booking:", col2X, summaryStartY + 16);
      doc.setFont("helvetica", "bold");
      doc.text(summaryData.totalBookings.toString(), col2X + 40, summaryStartY + 16);
      doc.setFont("helvetica", "normal");

      // Row 2
      doc.text("Rata-rata Nilai Booking:", col1X, summaryStartY + 24);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(summaryData.averageBookingValue), col1X + 40, summaryStartY + 24);
      doc.setFont("helvetica", "normal");

      doc.text("Tingkat Okupansi:", col2X, summaryStartY + 24);
      doc.setFont("helvetica", "bold");
      doc.text(`${summaryData.occupancyRate.toFixed(1)}%`, col2X + 40, summaryStartY + 24);

      // Add financial data table title
      const tableHeaderY = summaryStartY + 40;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text("Laporan Keuangan Detail", margin, tableHeaderY);

      // Add note about payment status
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("*Hanya transaksi dengan status LUNAS yang dihitung dalam total", pageWidth - margin, tableHeaderY, {
        align: "right",
      });

      // Define table columns with better widths
      const tableColumns = [
        { header: "No", dataKey: "id", width: 8 },
        { header: "Tanggal IN", dataKey: "dateIn", width: 20 },
        { header: "Tanggal OUT", dataKey: "dateOut", width: 20 },
        { header: "Nama", dataKey: "visitorName", width: 30 },
        { header: "Villa", dataKey: "villa", width: 25 },
        { header: "Status", dataKey: "status", width: 15 },
        { header: "Deposite", dataKey: "deposite", width: 22 },
        { header: "Harga Villa", dataKey: "villaPrice", width: 22 },
        { header: "60% Pemilik", dataKey: "ownerShare", width: 22 },
        { header: "40% Pengelola", dataKey: "managerShare", width: 22 },
        { header: "Order ID", dataKey: "notes", width: 25 },
      ];

      // Define a type for the table row data
      type TableRowData = {
        [key: string]: string; // Add index signature to allow string indexing
        id: string;
        dateIn: string;
        dateOut: string;
        visitorName: string;
        villa: string;
        status: string;
        deposite: string;
        villaPrice: string;
        ownerShare: string;
        managerShare: string;
        notes: string;
      };

      // Format data for table
      const tableData: TableRowData[] = filteredFinancialData.map((entry, index) => {
        const isPaid = entry.paymentStatus === "paid";

        return {
          id: (index + 1).toString(),
          dateIn: new Date(entry.dateIn).toLocaleDateString("id-ID"),
          dateOut: new Date(entry.dateOut).toLocaleDateString("id-ID"),
          visitorName: entry.visitorName,
          villa: entry.villa,
          status: isPaid ? "LUNAS" : "BELUM LUNAS",
          deposite: formatCurrency(entry.deposite),
          villaPrice: formatCurrency(entry.villaPrice),
          ownerShare: formatCurrency(entry.ownerShare),
          managerShare: formatCurrency(entry.managerShare),
          notes: entry.notes,
        };
      });

      // Calculate table start position
      const tableStartY = tableHeaderY + 10;

      // Create table headers
      let currentY = tableStartY;
      let currentX = margin;

      // Draw table header with gradient
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, currentY, pageWidth - margin * 2, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);

      tableColumns.forEach(column => {
        const align = ["deposite", "villaPrice", "ownerShare", "managerShare"].includes(column.dataKey) ? "right" : "center";
        doc.text(column.header, currentX + column.width / 2, currentY + 5, { align });
        currentX += column.width;
      });

      // Draw table rows with alternating background
      currentY += 8;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 70, 70);

      // Check if we need multiple pages
      const rowHeight = 7;
      const maxRowsPerPage = Math.floor((pageHeight - currentY - margin * 2) / rowHeight);
      let currentPage = 1;

      tableData.forEach((row, rowIndex) => {
        // Add alternating row background
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, "F");
        }

        // Check if we need a new page
        if (rowIndex > 0 && rowIndex % maxRowsPerPage === 0) {
          doc.addPage();
          currentPage++;
          currentY = margin + 15;

          // Add header to new page
          doc.setFillColor(240, 240, 240);
          doc.rect(0, 0, pageWidth, margin * 2, "F");
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(50, 50, 50);
          doc.text(`${getReportTitle()} - Halaman ${currentPage}`, pageWidth / 2, margin, { align: "center" });

          // Add date range
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(dateRangeText, pageWidth / 2, margin + 7, { align: "center" });

          // Redraw table header
          doc.setFillColor(230, 230, 230);
          doc.rect(margin, currentY, pageWidth - margin * 2, 8, "F");
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(50, 50, 50);

          currentX = margin;
          tableColumns.forEach(column => {
            const align = ["deposite", "villaPrice", "ownerShare", "managerShare"].includes(column.dataKey) ? "right" : "center";
            doc.text(column.header, currentX + column.width / 2, currentY + 5, { align });
            currentX += column.width;
          });

          currentY += 8;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(70, 70, 70);
        }

        // Draw row
        currentX = margin;
        doc.setFontSize(7);

        // Draw cell borders and text
        tableColumns.forEach(column => {
          // Draw light cell borders
          doc.setDrawColor(220, 220, 220);
          doc.rect(currentX, currentY, column.width, rowHeight);

          // Align numbers to right, text to left or center
          const cellValue = row[column.dataKey] || "";
          let align = "left";

          if (["deposite", "villaPrice", "ownerShare", "managerShare"].includes(column.dataKey)) {
            align = "right";
          } else if (["id", "status"].includes(column.dataKey)) {
            align = "center";
          }

          // Set color for status
          if (column.dataKey === "status") {
            if (cellValue === "LUNAS") {
              doc.setTextColor(0, 128, 0); // Green for paid
            } else {
              doc.setTextColor(200, 100, 0); // Orange for unpaid
            }
          }

          // Calculate x position based on alignment
          let xPos;
          if (align === "right") {
            xPos = currentX + column.width - 2;
          } else if (align === "center") {
            xPos = currentX + column.width / 2;
          } else {
            xPos = currentX + 2;
          }

          doc.text(cellValue.toString(), xPos, currentY + 4, {
            align: align as "left" | "center" | "right" | "justify",
          });

          // Reset text color
          doc.setTextColor(70, 70, 70);

          currentX += column.width;
        });

        currentY += rowHeight;
      });

      // Add totals row with better styling
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight + 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);

      // Draw totals
      currentX = margin;
      let totalWidth = 0;

      // Skip columns for totals
      for (let i = 0; i < 6; i++) {
        totalWidth += tableColumns[i].width;
      }

      doc.text("TOTAL", margin + totalWidth - 20, currentY + 5, { align: "right" });

      // Add total values
      doc.text(formatCurrency(financialTotals.deposite), margin + totalWidth + tableColumns[6].width / 2, currentY + 5, { align: "center" });

      doc.text(formatCurrency(financialTotals.villaPrice), margin + totalWidth + tableColumns[6].width + tableColumns[7].width / 2, currentY + 5, { align: "center" });

      doc.text(formatCurrency(financialTotals.ownerShare), margin + totalWidth + tableColumns[6].width + tableColumns[7].width + tableColumns[8].width / 2, currentY + 5, { align: "center" });

      doc.text(formatCurrency(financialTotals.managerShare), margin + totalWidth + tableColumns[6].width + tableColumns[7].width + tableColumns[8].width + tableColumns[9].width / 2, currentY + 5, { align: "center" });

      // Add footer
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text(`Dicetak pada: ${format(new Date(), "dd MMMM yyyy HH:mm")}`, margin, footerY);
      doc.text(`Halaman ${currentPage} dari ${currentPage}`, pageWidth - margin, footerY, { align: "right" });

      // Save the PDF
      doc.save(`laporan-keuangan-${date?.from ? format(date.from, "dd-MM-yyyy") : ""}-${date?.to ? format(date.to, "dd-MM-yyyy") : ""}.pdf`);

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
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type="search" placeholder="Cari..." className="pl-8 w-full sm:w-[250px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <Button variant="outline" onClick={handleExport}>
                          <Download className="h-4 w-4 mr-2" />
                          <span>Export Pdf</span>
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
                                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteEntry(entry.id)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                      </Button>
                                      <Button variant="ghost" size="icon" className="text-primary" onClick={() => handleEditEntry(entry.id)}>
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                      </Button>
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
