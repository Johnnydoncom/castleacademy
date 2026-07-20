import { ShieldAlert } from "lucide-react";

/**
 * Shown in place of an owner-only page when a non-owner admin navigates to it.
 */
export function OwnerOnlyNotice({ feature }: { feature: string }) {
  return (
    <div className="max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-amber-900">Owner access required</h2>
      <p className="mt-2 text-sm text-amber-800/90">
        {feature} is restricted to the owner account. Please contact the venue owner if you need
        changes made here.
      </p>
    </div>
  );
}
