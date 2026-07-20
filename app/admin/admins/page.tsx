import { AdminManagement } from "@/components/admin/admin-management";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { isOwner } from "@/lib/auth";
import { OwnerOnlyNotice } from "@/components/admin/owner-only-notice";

export const metadata = {
  title: "Admin Accounts — Castle Academy Admin",
};

export default async function AdminsPage() {
  if (!(await isOwner())) {
    return (
      <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8">
        <AdminPageHeader title="Admin Accounts" description="Manage who has access to this dashboard." />
        <OwnerOnlyNotice feature="Admin Accounts" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8">
      <AdminPageHeader
        title="Admin Accounts"
        description="Manage who has access to this dashboard."
      />
      <AdminManagement />
    </div>
  );
}
