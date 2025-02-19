import { Suspense } from "react";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "sonner";
import ReservationsTable from "@/components/ReservationsTable";
import { TableSkeleton } from "@/components/TableSkeleton";

export default async function ReservationsPage() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Toaster richColors />
      <Navigation />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="space-y-8">
          <h1 className="text-3xl font-bold">Reservations</h1>

          <Card>
            <CardHeader>
              <CardTitle>Reservation Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<TableSkeleton />}>
                <ReservationsTable />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
