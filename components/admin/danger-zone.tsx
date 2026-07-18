"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

export function DangerZone() {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reset-bookings", { method: "DELETE" });
      if (res.ok) {
        alert("All bookings have been successfully deleted.");
        setShowConfirm(false);
      } else {
        alert("Failed to reset bookings.");
      }
    } catch (e) {
      alert("An error occurred while resetting bookings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-12 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-6 shadow-sm max-w-2xl">
      <div className="flex items-center gap-3 text-red-700 dark:text-red-500 mb-4">
        <AlertTriangle className="h-6 w-6" />
        <h2 className="text-lg font-semibold">Danger Zone</h2>
      </div>
      
      <p className="text-sm text-red-600 dark:text-red-400 mb-6 leading-relaxed">
        This action will permanently delete all booking records from the database. This is intended to clean up test data before going live. <strong>This action cannot be undone.</strong> Your admin accounts, blocked slots, and venue settings will not be affected.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Reset All Bookings
        </button>
      ) : (
        <div className="bg-white/50 dark:bg-black/20 p-4 rounded-lg border border-red-200 dark:border-red-900/50 flex flex-col gap-4">
          <p className="text-sm font-semibold text-red-800 dark:text-red-400">Are you absolutely sure?</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {loading ? "Deleting..." : "Yes, permanently delete everything"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
