import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { AdminLogin } from "@/components/admin/admin-login";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const token = store.get("admin_session")?.value;
  const isValid = token ? verifyToken(token) !== null : false;

  if (!isValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-royal">
        <AdminLogin />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
