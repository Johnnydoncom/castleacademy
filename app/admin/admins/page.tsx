import { AdminManagement } from "@/components/admin/admin-management";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata = {
  title: "Admin Accounts — Castle Academy Admin",
};

export default function AdminsPage() {
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
