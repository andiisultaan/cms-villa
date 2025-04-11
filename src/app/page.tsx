import { Suspense } from "react";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVillas } from "@/db/models/villa";
import VillaTable from "@/components/VillaTable";
import { Toaster } from "sonner";
import { DashboardStatsSkeleton } from "@/components/DashboardStatsSkeleton";
import { VillaTableSkeleton } from "@/components/VillaTableSkeleton";

async function DashboardStats() {
  const villas = await getVillas();
  const totalVillas = villas.length;
  const totalBookings = villas.filter(villa => villa.status === "booked").length;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Total Villas 🏡</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalVillas}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Bookings ✅</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalBookings}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function Home() {
  return (
    <div className="flex h-screen bg-gray-200">
      <Toaster richColors />
      <Navigation />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="space-y-8">
          <h1 className="text-3xl font-bold">Gonjong Harau Dashboard</h1>

          <Suspense fallback={<DashboardStatsSkeleton />}>
            <DashboardStats />
          </Suspense>

          <Card>
            <CardHeader>
              <CardTitle>Villa Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<VillaTableSkeleton />}>
                <VillaTable />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
