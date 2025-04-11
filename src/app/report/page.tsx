"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, Printer } from "lucide-react";
import type { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

// Define types based on your API response
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

interface ApiResponse<T> {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
}

export default function FinancialReportPage() {
  // Get user from auth context with fallback for when it's undefined
  const { data: session, status } = useAuth();
  const user = session?.user;
  console.log("Auth state:", { user, status });

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
  const [activeTab, setActiveTab] = useState("all-bookings");

  const printRef = useRef<HTMLDivElement>(null);

  // Handle printing with jsPDF and html2canvas
  const handlePrint = async () => {
    if (!printRef.current) return;

    try {
      // Show loading state or notification if needed

      const content = printRef.current;
      const canvas = await html2canvas(content, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        windowWidth: content.scrollWidth,
        windowHeight: content.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 0;

      // Add image to PDF
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);

      // If content is longer than a page, add more pages
      const pageHeight = 295; // A4 height in mm

      if (imgHeight > pageHeight) {
        let heightLeft = imgHeight - pageHeight;
        let pageNum = 1;

        while (heightLeft > 0) {
          position = -pageHeight * pageNum;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          pageNum += 1;
        }
      }

      // Save the PDF
      const fileName = `Laporan_Keuangan_Villa_${date?.from ? format(date.from, "dd-MM-yyyy") : ""}_${date?.to ? format(date.to, "dd-MM-yyyy") : ""}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      // Show error notification if needed
    }
  };

  // Add this function to handle the button click
  const onPrintClick = () => {
    if (printRef.current) {
      handlePrint();
    }
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
          setBookings(bookingsData.data);
          setVillas(villasData.data);

          // Create villa map for quick lookup
          const map: Record<string, Villa> = {};
          villasData.data.forEach(villa => {
            map[villa._id] = villa;
          });
          setVillaMap(map);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
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
  }, [date, bookings, villas]);

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
      return user.role === "owner" && villaMap[villaId]?.owner === user.id;
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
            <Button onClick={onPrintClick} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              <span>Cetak PDF</span>
            </Button>
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

            <Tabs defaultValue="all-bookings" className="no-print" onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all-bookings">Semua Booking</TabsTrigger>
                {(user?.role === "admin" || user?.role === "owner") && <TabsTrigger value="by-villa">Laporan Per Villa</TabsTrigger>}
              </TabsList>

              <TabsContent value="all-bookings">
                <Card>
                  <CardHeader>
                    <CardTitle>Daftar Booking</CardTitle>
                    <CardDescription>
                      Semua transaksi booking dalam periode {date?.from && format(date.from, "PPP")} - {date?.to && format(date.to, "PPP")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Villa</TableHead>
                          <TableHead>Tamu</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Total Tamu</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center">
                              Tidak ada data booking dalam periode ini
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredBookings.map(booking => (
                            <TableRow key={booking._id}>
                              <TableCell className="font-medium">{booking.orderId}</TableCell>
                              <TableCell>{villaMap[booking.villaId]?.name || "Unknown Villa"}</TableCell>
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
                          ))
                        )}
                      </TableBody>
                      {filteredBookings.length > 0 && (
                        <>
                          <tfoot className="border-t">
                            <tr>
                              <td colSpan={7} className="text-right font-medium py-4">
                                Total:
                              </td>
                              <td className="text-right font-medium py-4">{formatCurrency(summaryData.totalRevenue)}</td>
                            </tr>
                          </tfoot>
                          <TableCaption className="sr-only">Total: {formatCurrency(summaryData.totalRevenue)}</TableCaption>
                        </>
                      )}
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

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
            </Tabs>

            {/* Print-only content - shows the active tab content when printing */}
            <div className="hidden print:block">
              {activeTab === "all-bookings" ? (
                <div className="mt-8">
                  <h2 className="text-xl font-bold mb-4">Daftar Booking</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Semua transaksi booking dalam periode {date?.from && format(date.from, "dd MMMM yyyy")} - {date?.to && format(date.to, "dd MMMM yyyy")}
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Villa</TableHead>
                        <TableHead>Tamu</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">
                            Tidak ada data booking dalam periode ini
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBookings.map(booking => (
                          <TableRow key={booking._id}>
                            <TableCell className="font-medium">{booking.orderId}</TableCell>
                            <TableCell>{villaMap[booking.villaId]?.name || "Unknown Villa"}</TableCell>
                            <TableCell>{booking.name}</TableCell>
                            <TableCell>{formatDate(booking.checkInDate)}</TableCell>
                            <TableCell>{formatDate(booking.checkOutDate)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${booking.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                {booking.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(booking.amount)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    {filteredBookings.length > 0 && (
                      <>
                        <tfoot className="border-t">
                          <tr>
                            <td colSpan={6} className="text-right font-medium py-4">
                              Total:
                            </td>
                            <td className="text-right font-medium py-4">{formatCurrency(summaryData.totalRevenue)}</td>
                          </tr>
                        </tfoot>
                        <TableCaption className="sr-only">Total: {formatCurrency(summaryData.totalRevenue)}</TableCaption>
                      </>
                    )}
                  </Table>
                </div>
              ) : user?.role === "admin" || user?.role === "owner" ? (
                <div className="mt-8">
                  <h2 className="text-xl font-bold mb-4">Ringkasan Per Villa</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Pendapatan dan jumlah booking per villa dalam periode {date?.from && format(date.from, "dd MMMM yyyy")} - {date?.to && format(date.to, "dd MMMM yyyy")}
                  </p>
                  <Table className="mb-8">
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

                  {villaSummaries.map(summary => (
                    <div key={summary.villaId} className="mb-8 page-break-inside-avoid">
                      <h3 className="text-lg font-bold mb-2">{summary.villaName}</h3>
                      <p className="text-sm text-gray-600 mb-4">Detail booking untuk {summary.villaName}</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Tamu</TableHead>
                            <TableHead>Check In</TableHead>
                            <TableHead>Check Out</TableHead>
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
                            <td colSpan={5} className="text-right font-medium py-4">
                              Total:
                            </td>
                            <td className="text-right font-medium py-4">{formatCurrency(summary.totalRevenue)}</td>
                          </tr>
                        </tfoot>
                        <TableCaption className="sr-only">Total: {formatCurrency(summary.totalRevenue)}</TableCaption>
                      </Table>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-8">
                  <p className="text-center text-amber-600">Anda tidak memiliki akses untuk melihat laporan per villa.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
