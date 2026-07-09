/**
 * Castle Academy — Booking Form Handler
 * ======================================
 * Paste this entire file into your Google Apps Script editor.
 *
 * SETUP STEPS:
 *  1. Open https://script.google.com and create a new project.
 *  2. Paste this code, replacing the SPREADSHEET_ID and NOTIFICATION_EMAIL constants below.
 *  3. Click Deploy → New Deployment → Web App.
 *     - Execute as:    "Me"
 *     - Who has access: "Anyone"
 *  4. Copy the deployment URL and set it as NEXT_PUBLIC_GOOGLE_SCRIPT_URL in your .env.local.
 *
 * HOW IT WORKS:
 *  - doPost(e)    → receives the booking JSON, writes a row, sends two emails.
 *  - doGet(e)     → health-check endpoint (handy for verifying deployment).
 *  - doOptions(e) → preflight CORS reply (handles OPTIONS requests from browsers).
 */

// ─── CONFIGURATION ───────────────────────────────────────────────────────────

/** Replace with your Google Spreadsheet ID (the long hash in the Sheet URL). */
const SPREADSHEET_ID = "1MRx7ukFZ7Y2Ee_mY2Pfdw6E3x9CtRJwVvt6exx9Zp0g";

/** Sheet tab name — will be created automatically if it does not exist. */
const SHEET_NAME = "Bookings";

/** Notification emails — all addresses receive the admin alert. */
const NOTIFICATION_EMAIL = "thecastleacademyspace@gmail.com"; // change this

/** Optional: also CC another address (e.g. operations team). Leave empty "" to skip. */
const CC_EMAIL = "";

/** Your venue name — used in email subjects and signatures. */
const VENUE_NAME = "Castle Academy";

/** Your WhatsApp or phone number (displayed in confirmation email). */
const SUPPORT_WHATSAPP = "2349042222296";

// ─── COLUMN ORDER ────────────────────────────────────────────────────────────

const COLUMNS = [
  "Submitted At",
  "Full Name",
  "Organisation",
  "Phone",
  "Email",
  "Event Type",
  "Start Date",
  "End Date",
  "Start Time",
  "End Time",
  "Participants",
  "Requirements",
  "Status",
  "Invoice Total",
  "Invoice Breakdown",
  "Discount Applied",
];

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

/**
 * Entry point for POST requests from the booking form.
 * The client sends JSON with Content-Type: text/plain to avoid CORS preflight.
 */
function doPost(e) {
  try {
    const raw = e.postData ? e.postData.contents : null;
    if (!raw) return jsonResponse({ ok: false, error: "Empty body" }, 400);

    const data = JSON.parse(raw);
    const errors = validatePayload(data);
    if (errors.length) {
      return jsonResponse({ ok: false, error: "Validation failed", details: errors }, 422);
    }

    // 1. Write to spreadsheet
    appendRow(data);

    return jsonResponse({ ok: true, message: "Booking received" });
  } catch (err) {
    Logger.log("doPost error: " + err.message + "\n" + err.stack);
    return jsonResponse({ ok: false, error: "Internal server error" }, 500);
  }
}

/** Health-check: open the deployment URL in a browser to verify it works. */
function doGet() {
  return jsonResponse({ ok: true, service: VENUE_NAME + " Booking API", version: "1.0" });
}

/** CORS preflight handler — required for non-simple requests. */
function doOptions() {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ─── SPREADSHEET ─────────────────────────────────────────────────────────────

function appendRow(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  // Auto-create the sheet + header row on first use
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);

    // Style the header row
    const header = sheet.getRange(1, 1, 1, COLUMNS.length);
    header.setFontWeight("bold");
    header.setBackground("#0d0d0d"); // royal noir
    header.setFontColor("#ffffff");
    header.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);  // Submitted At
    sheet.setColumnWidth(2, 180);  // Full Name
    sheet.setColumnWidth(12, 300); // Requirements
  }

  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([
    now,
    safe(data.fullName),
    safe(data.organisation),
    safe(data.phone),
    safe(data.email),
    formatEventType(safe(data.eventType)),
    safe(data.startDate),
    safe(data.endDate),
    safe(data.startTime),
    safe(data.endTime),
    Number(data.participants) || 0,
    safe(data.requirements),
    "Pending",
    data.invoiceTotal ? "₦" + Number(data.invoiceTotal).toLocaleString() : "—",
    safe(data.invoiceBreakdown),
    safe(data.discountApplied),
  ]);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function jsonResponse(data, statusCode) {
  const body = Object.assign({ status: statusCode || 200 }, data);
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function validatePayload(d) {
  const required = ["fullName", "phone", "email", "eventType", "startDate", "endDate", "startTime", "endTime", "participants"];
  return required.filter(function(k) { return !d[k]; });
}

function safe(v) {
  return v == null ? "" : String(v).trim();
}

function formatEventType(v) {
  var map = {
    training: "Corporate Training",
    workshop: "Workshop",
    seminar: "Seminar",
    meeting: "Team Meeting",
    coaching: "Coaching Session",
    other: "Other",
  };
  return map[v] || v || "—";
}
