import { VenueSettings } from "@/components/admin/venue-settings";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DangerZone } from "@/components/admin/danger-zone";

export const metadata = {
  title: "Venue Settings — Castle Academy Admin",
};

export default function SettingsPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8">
      <AdminPageHeader
        title="Venue Settings"
        description="Configure opening hours and social media links."
      />
      <VenueSettings />
      <DangerZone />
    </div>
  );
}
