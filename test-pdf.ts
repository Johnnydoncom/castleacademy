import { generateBookingPdf } from "./lib/invoice";
import fs from "fs";

async function main() {
  try {
    const booking = {
      reference: "CA-20260718-E7602D",
      invoice_number: null,
      full_name: "Test User",
      organisation: null,
      email: "test@example.com",
      phone: "1234567890",
      event_type: "studio",
      start_date: new Date("2026-07-25"), // Simulated postgres Date object
      end_date: new Date("2026-07-25"),
      start_time: "10:00:00",
      end_time: "12:00:00",
      participants: 1,
      status: "pending",
      payment_status: "unpaid",
      payment_method: null,
      invoice_subtotal: 10000,
      invoice_vat: 750,
      invoice_total: 10750,
      invoice_breakdown: null,
      discount_applied: null,
      extras: null,
      paid_at: null,
    };
    
    // @ts-ignore
    const pdf = await generateBookingPdf(booking, "invoice");
    fs.writeFileSync("test.pdf", pdf);
    console.log("PDF generated successfully");
  } catch (err) {
    console.error("Failed to generate PDF:", err);
  }
}

main();
