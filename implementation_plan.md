# Invoice Generation on Booking

When a booking is submitted, a professional invoice (PDF) is automatically generated and emailed to the customer as an attachment, alongside the existing confirmation email.

## User Review Required

> [!IMPORTANT]
> **Pricing is not defined anywhere in the codebase.** The invoice needs line items and amounts. I need your input on the pricing structure — see Open Questions below before I can build the final version.

> [!IMPORTANT]
> **Invoice number sequence** — Google Apps Script has no persistent counter unless we store it somewhere. I plan to store the last invoice number in the same Google Sheet (a named range or a dedicated "Config" sheet tab). Is that acceptable, or would you prefer a date-based number like `INV-20260706-001`?

## Open Questions

1. **Pricing model** — How is the venue priced? Pick one:
   - **A) Flat day/half-day rate** (e.g. ₦150,000/day, ₦80,000/half-day) — based on duration
   - **B) Per-participant rate** (e.g. ₦5,000/person) — multiplied by participant count
   - **C) Per event-type rate** (e.g. Training = ₦120,000, Workshop = ₦80,000)
   - **D) Manual/Quote-based** — Invoice is generated with a ₦0 / "To Be Confirmed" amount; admin fills in the real figure later
   - **E) Combination** — Base venue fee + per-participant add-on

2. **VAT / taxes** — Should VAT (7.5% in Nigeria) be added as a separate line item?

3. **Payment due date** — How many days after the invoice date should payment be due? (e.g. 3, 7, or 14 days)

4. **Bank details** — Should bank account details appear on the invoice for direct transfer? If yes, please provide:
   - Bank name
   - Account name
   - Account number

5. **Invoice format** — Should the invoice be:
   - **A) PDF attachment** to the email (generated via Google Docs / `DriveApp`)
   - **B) HTML embedded inline** in the email body (simpler, no attachment)

---

## Proposed Changes

### `google-apps-script/booking-handler.gs`

This is the **only file** that needs to change. All invoice logic lives in Google Apps Script so no Next.js code is touched.

#### [MODIFY] [booking-handler.gs](file:///c:/Users/johnn/Documents/projects/castleacademy/google-apps-script/booking-handler.gs)

New additions:

| Section | What it does |
|---|---|
| `PRICING` config block | Defines rates, VAT toggle, payment terms, bank details |
| `INVOICE_NUMBER` config | Prefix + starting number stored in Sheet |
| `generateInvoiceNumber()` | Reads + increments counter from a "Config" sheet tab |
| `calculateInvoiceLines(data)` | Returns an array of `{ description, qty, unit, amount }` line items |
| `buildInvoicePdf(data, lines, invoiceNo)` | Creates a styled Google Doc, exports it as PDF blob |
| `buildInvoiceHtml(data, lines, invoiceNo)` | Alternative: returns an inline HTML invoice string |
| `sendCustomerEmail(data)` | **Updated** to attach the PDF (or embed HTML invoice) |

The PDF approach uses:
- `DocumentApp.create()` → styled Google Doc → `getAs(MimeType.PDF)` → `GmailApp.sendEmail(..., { attachments: [pdfBlob] })`
- Temporary doc is deleted after sending (no Drive clutter)

---

## Verification Plan

### Manual Verification
1. Submit a test booking via the website form
2. Check the customer's inbox for the email — confirm:
   - Invoice number is sequential
   - Line items and totals are correct
   - PDF opens cleanly / HTML renders correctly
3. Submit a second test booking and confirm the invoice number incremented
4. Check the "Config" sheet tab to confirm the counter updated
