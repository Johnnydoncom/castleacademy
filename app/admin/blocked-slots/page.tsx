import { BlockedSlots } from "@/components/admin/blocked-slots";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata = {
  title: "Blocked Slots — Castle Academy Admin",
};

export default function BlockedSlotsPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8">
      <AdminPageHeader
        title="Blocked Slots"
        description="Manually block specific dates and times from being booked."
      />
      <BlockedSlots />
    </div>
  );
}
