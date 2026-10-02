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
    // The shell is pinned to the viewport so only the content pane scrolls and
    // the sidebar stays put. `relative` on the pane matters: without it,
    // absolutely positioned descendants (sr-only labels, Radix's hidden native
    // <select>) escape the pane and stretch the document, scrolling the whole page.
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <AdminSidebar />
      <div className="relative flex-1 flex flex-col min-w-0 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
