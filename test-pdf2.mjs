import { PDFDocument, StandardFonts } from "pdf-lib";

async function test() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 500]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  try {
    page.drawText("Test — en-dash – and emoji 😀", { x: 50, y: 400, font, size: 12 });
    await doc.save();
    console.log("Success with emoji");
  } catch (err) {
    console.error("Failed with emoji:", err);
  }
}
test();
