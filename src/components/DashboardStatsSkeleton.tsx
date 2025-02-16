import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Total Villas 🏡</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-20" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Bookings ✅</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-20" />
        </CardContent>
      </Card>
    </div>
  );
}
