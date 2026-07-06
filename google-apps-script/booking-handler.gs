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

    // 2. Notify admin
    sendAdminEmail(data);

    // 3. Confirm to customer
    sendCustomerEmail(data);

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
  ]);
}

// ─── ADMIN EMAIL ─────────────────────────────────────────────────────────────

function sendAdminEmail(data) {
  const subject = "[" + VENUE_NAME + "] New Booking — " + safe(data.fullName) + " · " + safe(data.startDate);
  const html = adminEmailHtml(data);

  const options = {
    htmlBody: html,
    name: VENUE_NAME + " Bookings",
  };
  if (CC_EMAIL) options.cc = CC_EMAIL;

  GmailApp.sendEmail(NOTIFICATION_EMAIL, subject, stripHtml(html), options);
}

function adminEmailHtml(d) {
  const dateLabel = d.startDate === d.endDate
    ? d.startDate
    : d.startDate + " → " + d.endDate;

  return "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>" +
    "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>" +
    "<table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>" +

    // Header
    "<tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>" +
    "<img src='https://castleacademy.ng/logo.png' alt='" + VENUE_NAME + "' height='48' style='display:block;margin:0 auto 12px;' />" +
    "<p style='margin:4px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>New Booking Request</p>" +
    "</td></tr>" +

    // Alert banner
    "<tr><td style='background:#c9a84c;padding:12px 32px;'>" +
    "<p style='margin:0;color:#0d0d0d;font-size:14px;font-weight:600;'>&#128197; " + dateLabel + " &nbsp;|&nbsp; &#9200; " + d.startTime + " – " + d.endTime + " &nbsp;|&nbsp; &#128101; " + d.participants + " participants</p>" +
    "</td></tr>" +

    // Details table
    "<tr><td style='padding:28px 32px;'>" +
    "<table width='100%' cellpadding='0' cellspacing='0'>" +
    row("Full Name", d.fullName) +
    row("Organisation", d.organisation || "—") +
    row("Phone", d.phone) +
    row("Email", d.email) +
    row("Event Type", formatEventType(d.eventType)) +
    row("Start Date", d.startDate) +
    row("End Date", d.endDate) +
    row("Start Time", d.startTime) +
    row("End Time", d.endTime) +
    row("Participants", d.participants) +
    row("Requirements", d.requirements || "None") +
    "</table></td></tr>" +

    // CTA
    "<tr><td style='padding:0 32px 28px;'>" +
    "<p style='font-size:13px;color:#555;margin:0 0 12px;'>Reply to this email or open the spreadsheet to manage the booking.</p>" +
    "<a href='https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID + "' style='display:inline-block;background:#0d0d0d;color:#c9a84c;padding:10px 24px;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none;'>Open Spreadsheet →</a>" +
    "</td></tr>" +

    // Footer
    "<tr><td style='background:#f5f3ee;padding:16px 32px;border-top:1px solid #e0e0e0;'>" +
    "<p style='margin:0;font-size:11px;color:#999;text-align:center;'>Automated notification from the " + VENUE_NAME + " booking form.</p>" +
    "</td></tr>" +

    "</table></td></tr></table></body></html>";
}

// ─── CUSTOMER CONFIRMATION EMAIL ─────────────────────────────────────────────

function sendCustomerEmail(data) {
  if (!data.email) return;

  const subject = "Your " + VENUE_NAME + " booking request has been received";
  const html = customerEmailHtml(data);

  GmailApp.sendEmail(
    data.email,
    subject,
    stripHtml(html),
    { htmlBody: html, name: VENUE_NAME, replyTo: NOTIFICATION_EMAIL }
  );
}

function customerEmailHtml(d) {
  const firstName = (d.fullName || "there").split(" ")[0];
  const dateLabel = d.startDate === d.endDate
    ? d.startDate
    : d.startDate + " → " + d.endDate;
  const waNumber = SUPPORT_WHATSAPP.replace(/\D/g, "");
  const year = new Date().getFullYear();

  return "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f5f3ee;font-family:Helvetica,Arial,sans-serif;'>" +
    "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;padding:32px 0;'><tr><td align='center'>" +
    "<table width='600' cellpadding='0' cellspacing='0' style='background:#fbf9f3;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);'>" +

    // Header
    "<tr><td style='background:#0d0d0d;padding:28px 32px;text-align:center;'>" +
    "<img src='https://castleacademy.ng/logo.png' alt='" + VENUE_NAME + "' height='48' style='display:block;margin:0 auto 12px;' />" +
    "<p style='margin:6px 0 0;color:#c9a84c;font-size:13px;opacity:.9;'>29b Olorunnimbe Street, Wemabod Estate, Adeniyi Jones, Ikeja, Lagos</p>" +
    "</td></tr>" +

    // Body
    "<tr><td style='padding:32px;'>" +
    "<h2 style='margin:0 0 8px;color:#0d0d0d;font-size:20px;'>Hi " + firstName + ", we got your request! &#127881;</h2>" +
    "<p style='margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;'>Thank you for choosing " + VENUE_NAME + ". We've received your booking request and our team will review it and get back to you within a few hours during business hours (Monday–Saturday, 9 am – 6 pm WAT).</p>" +

    // Summary box
    "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f3ee;border-radius:8px;margin-bottom:24px;'><tr><td style='padding:20px;'>" +
    "<p style='margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#0d0d0d;'>Your booking summary</p>" +
    "<table width='100%' cellpadding='0' cellspacing='0'>" +
    row("Date(s)", dateLabel) +
    row("Time", d.startTime + " – " + d.endTime) +
    row("Event type", formatEventType(d.eventType)) +
    row("Participants", d.participants) +
    "</table></td></tr></table>" +

    "<p style='margin:0 0 20px;color:#444;font-size:14px;line-height:1.7;'>Once we confirm availability, we'll send you payment instructions. You can also reach us directly on WhatsApp:</p>" +
    "<a href='https://wa.me/" + waNumber + "' style='display:inline-block;background:#25d366;color:#fff;padding:10px 24px;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:24px;'>&#128172; Chat on WhatsApp</a>" +
    "<p style='margin:20px 0 0;color:#888;font-size:12px;line-height:1.6;'>If you didn't submit this booking request, please ignore this email.<br>Reply to <a href='mailto:" + NOTIFICATION_EMAIL + "' style='color:#c9a84c;'>" + NOTIFICATION_EMAIL + "</a> if you have any concerns.</p>" +
    "</td></tr>" +

    // Footer
    "<tr><td style='background:#0d0d0d;padding:20px 32px;text-align:center;'>" +
    "<p style='margin:0;font-size:11px;color:#c9a84c;opacity:.9;'>© " + year + " " + VENUE_NAME + " · 29b Olorunnimbe Street, Wemabod Estate, Ikeja, Lagos</p>" +
    "</td></tr>" +

    "</table></td></tr></table></body></html>";
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

function row(label, value) {
  return "<tr><td style='padding:6px 0;font-size:13px;color:#888;width:40%;vertical-align:top;'>" + label + "</td>" +
         "<td style='padding:6px 0;font-size:13px;color:#222;font-weight:500;'>" + (value || "—") + "</td></tr>";
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
