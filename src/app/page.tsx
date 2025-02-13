import { Suspense } from "react";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { getVillas } from "@/db/models/villa";

async function VillaTable() {
  const villas = await getVillas();

  return (
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
          <TableRow key={villa._id.toString()}>
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
                <Button variant="outline" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

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

export default function Home() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Navigation />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="space-y-8">
          <h1 className="text-3xl font-bold">Gonjong Harau Dashboard</h1>

          <Suspense fallback={<div>Loading stats...</div>}>
            <DashboardStats />
          </Suspense>

          <Card>
            <CardHeader>
              <CardTitle>Villa Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading villas...</div>}>
                <VillaTable />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
