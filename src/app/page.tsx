import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// This would typically come from an API
const villas = [
  { id: 1, name: "Sunset Villa", location: "Bali", price: 200, booked: 5 },
  { id: 2, name: "Ocean View Resort", location: "Maldives", price: 350, booked: 3 },
  { id: 3, name: "Mountain Retreat", location: "Swiss Alps", price: 180, booked: 2 },
];

export default function Home() {
  const totalVillas = villas.length;
  const totalBookings = villas.reduce((sum, villa) => sum + villa.booked, 0);

  return (
    <>
      <div className="flex h-screen bg-gray-100">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="space-y-8">
            <h1 className="text-3xl font-bold">Gonjong Harau Dashboard</h1>

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

            <Card>
              <CardHeader>
                <CardTitle>Villa Data</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Price per Night</TableHead>
                      <TableHead>Bookings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {villas.map(villa => (
                      <TableRow key={villa.id}>
                        <TableCell>{villa.name}</TableCell>
                        <TableCell>{villa.location}</TableCell>
                        <TableCell>${villa.price}</TableCell>
                        <TableCell>{villa.booked}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}
