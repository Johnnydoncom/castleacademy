import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { isOwner } from "@/lib/auth";

// Destructive reset is owner-only.
async function checkAuth() {
  return isOwner();
}

export async function DELETE() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete all bookings. (Admin records, blocked slots, and settings remain untouched)
    await db.delete(bookings);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API reset-bookings] error:", err);
    return NextResponse.json({ error: "Failed to reset bookings" }, { status: 500 });
  }
}
