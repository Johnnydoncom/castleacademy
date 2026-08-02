import { PricingSettings } from "@/components/admin/pricing-settings";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { isOwner } from "@/lib/auth";
import { OwnerOnlyNotice } from "@/components/admin/owner-only-notice";

export const metadata = {
  title: "Pricing — Castle Academy Admin",
};

const DESCRIPTION =
  "Package rates, weekday specials and discounts. Changes apply to new quotes immediately.";

export default async function PricingPage() {
  if (!(await isOwner())) {
    return (
      <div className="flex-1 p-6 pt-20 lg:p-8 lg:pt-8">
        <AdminPageHeader title="Pricing" description={DESCRIPTION} />
        <OwnerOnlyNotice feature="Pricing" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 pt-20 lg:p-8 lg:pt-8">
      <AdminPageHeader title="Pricing" description={DESCRIPTION} />
      <PricingSettings />
    </div>
  );
}
