import { BookingsTable } from "@/components/admin/bookings-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata = {
  title: "Bookings — Castle Academy Admin",
};

export default function BookingsPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8">
      <AdminPageHeader
        title="Bookings"
        description="View and manage all venue booking requests."
      />
      <BookingsTable />
    </div>
  );
}
