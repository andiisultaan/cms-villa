import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function VillaTableSkeleton() {
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
        {[...Array(5)].map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-4 w-[100px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[200px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[80px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[60px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-[80px]" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-8 w-[80px]" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
