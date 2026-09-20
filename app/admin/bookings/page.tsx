import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { BookingsTable } from "@/components/admin/bookings-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Bookings — Castle Academy Admin",
};

export default function BookingsPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8">
      <AdminPageHeader
        title="Bookings"
        description="View and manage all venue booking requests."
        actions={
          <Link href="/admin/bookings/new">
            <Button
              size="sm"
              className="gap-2 bg-gold text-royal-deep hover:bg-gold/90 font-semibold shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              Create Booking
            </Button>
          </Link>
        }
      />
      <BookingsTable />
    </div>
  );
}
