import { VenueSettings } from "@/components/admin/venue-settings";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DangerZone } from "@/components/admin/danger-zone";
import { isOwner } from "@/lib/auth";
import { OwnerOnlyNotice } from "@/components/admin/owner-only-notice";

export const metadata = {
  title: "Venue Settings — Castle Academy Admin",
};

export default async function SettingsPage() {
  if (!(await isOwner())) {
    return (
      <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8">
        <AdminPageHeader title="Venue Settings" description="Configure opening hours and social media links." />
        <OwnerOnlyNotice feature="Venue Settings" />
      </div>
    );
  }

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
