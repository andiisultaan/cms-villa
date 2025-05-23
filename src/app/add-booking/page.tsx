"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Navigation from "@/components/navigation";

// Define the API response type to match your backend
type ApiResponse<T> = {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
};

// Define the booking data type
type BookingData = {
  id: string;
  villaId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  amount?: number;
  paymentStatus?: string;
};

type SerializedVilla = {
  _id: string;
  name: string;
  description: string;
  price: string;
  capacity: string;
  status: "available" | "booked" | "maintenance";
  images: Array<{ url: string; publicId: string }>;
};

async function fetchVillas(): Promise<SerializedVilla[]> {
  const response = await fetch("/api/villas", {
    cache: "no-store", // Disable caching
    headers: {
      "Cache-Control": "no-cache",
      pagma: "no-cache",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch villas");
  }
  const data = await response.json();
  return data.data;
}

// This schema matches the form fields and validation
const formSchema = z
  .object({
    villaId: z.string({
      required_error: "Silakan pilih villa",
    }),
    checkInDate: z.date({
      required_error: "Silakan pilih tanggal check-in",
    }),
    checkOutDate: z
      .date({
        required_error: "Silakan pilih tanggal check-out",
      })
      .refine(date => date > new Date(), {
        message: "Tanggal check-out harus setelah hari ini",
      }),
    guests: z.coerce
      .number()
      .min(1, {
        message: "Minimal 1 tamu",
      })
      .max(10, {
        message: "Maksimal 10 tamu",
      }),
    name: z.string().min(2, {
      message: "Nama harus minimal 2 karakter",
    }),
    email: z.string().email({
      message: "Email tidak valid",
    }),
    phone: z.string().min(10, {
      message: "Nomor telepon tidak valid",
    }),
    amount: z.coerce.number().min(0, {
      message: "Jumlah harus lebih dari 0",
    }),
    hasExtraBed: z.boolean().default(false),
    extraBed: z.coerce.number().min(0).optional(),
    priceExtraBed: z.coerce.number().min(0).optional(),
  })
  .refine(data => data.checkOutDate > data.checkInDate, {
    message: "Tanggal check-out harus setelah tanggal check-in",
    path: ["checkOutDate"],
  });

export default function AddBookingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [villas, setVillas] = useState<SerializedVilla[]>([]);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      guests: 1,
      amount: 0,
      hasExtraBed: false,
      extraBed: 0,
      priceExtraBed: 0,
    },
  });

  useEffect(() => {
    fetchVillas()
      .then(fetchedVillas => {
        setVillas(fetchedVillas);
      })
      .catch(error => {
        console.error("Error fetching villas:", error);
        toast.error("Gagal memuat data villa");
      });
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // Format the data according to the API schema
      const bookingData = {
        villaId: values.villaId,
        checkInDate: format(values.checkInDate, "yyyy-MM-dd"), // Format as string
        checkOutDate: format(values.checkOutDate, "yyyy-MM-dd"), // Format as string
        guests: values.guests,
        name: values.name,
        email: values.email,
        phone: values.phone,
        amount: values.amount,
        paymentStatus: "pending",
      };

      // Make the API call
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      const result = (await response.json()) as ApiResponse<BookingData>;

      // Check if the response is not successful
      if (response.status !== 201 || result.statusCode !== 201) {
        throw new Error(result.error || "Failed to create booking");
      }

      // Show success message using Sonner
      toast.success("Booking berhasil dibuat", {
        description: `Booking ID: ${result.data?.id}`,
      });

      // Redirect to bookings list
      router.push("/report");
      router.refresh();
    } catch (error) {
      console.error("Error creating booking:", error);

      // Show error message using Sonner
      toast.error("Gagal membuat booking", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat membuat booking",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Watch for extra bed checkbox to conditionally show extra fields
  const hasExtraBed = form.watch("hasExtraBed");

  return (
    <>
      <Toaster richColors />
      <div className="flex min-h-screen">
        <main className="flex-1 bg-gray-200 p-8">
          <div className="mb-6">
            <Button variant="outline" onClick={() => router.push("/report")} className="flex items-center gap-2 bg-white hover:bg-gray-100">
              <ChevronLeft className="h-4 w-4" />
              Kembali ke Laporan
            </Button>
          </div>
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle>Form Booking</CardTitle>
              <CardDescription>Isi semua informasi yang diperlukan untuk membuat booking baru</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Informasi Booking</h3>
                      <p className="text-sm text-muted-foreground">Detail mengenai villa dan tanggal booking</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="villaId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Villa</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih villa" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {villas.map(villa => (
                                  <SelectItem key={villa._id} value={villa._id}>
                                    {villa.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="guests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Jumlah Tamu</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} max={10} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="checkInDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Check-in</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="checkOutDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Check-out</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Informasi Tamu</h3>
                      <p className="text-sm text-muted-foreground">Detail kontak tamu untuk booking ini</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nama Lengkap</FormLabel>
                            <FormControl>
                              <Input placeholder="Masukkan nama lengkap" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nomor Telepon</FormLabel>
                            <FormControl>
                              <Input placeholder="Contoh: 081234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Informasi Pembayaran</h3>
                      <p className="text-sm text-muted-foreground">Detail biaya booking</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Biaya (Rp)</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hasExtraBed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Tambah Extra Bed</FormLabel>
                              <FormDescription>Centang jika tamu membutuhkan tempat tidur tambahan</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {hasExtraBed && (
                        <>
                          <FormField
                            control={form.control}
                            name="extraBed"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jumlah Extra Bed</FormLabel>
                                <FormControl>
                                  <Input type="number" min={0} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="priceExtraBed"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Harga Extra Bed (Rp)</FormLabel>
                                <FormControl>
                                  <Input type="number" min={0} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button variant="outline" type="button" onClick={() => router.back()}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Simpan Booking
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
