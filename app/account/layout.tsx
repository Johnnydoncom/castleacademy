import { getCustomerSession } from "@/lib/customer-auth";
import { AccountAuth } from "@/components/account/account-auth";
import { AccountNav } from "@/components/account/account-nav";

export const metadata = {
  title: "My Account — Castle Academy",
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getCustomerSession();

  if (!session) {
    return <AccountAuth />;
  }

  return (
    <div className="min-h-screen bg-ivory">
      <AccountNav name={session.full_name} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
