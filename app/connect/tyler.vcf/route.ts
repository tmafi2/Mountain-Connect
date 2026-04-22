import { NextResponse } from "next/server";

/**
 * GET /connect/tyler.vcf
 *
 * Serves Tyler's contact card as a vCard 3.0 file. The Content-Type makes
 * iOS and Android open their native Add Contact sheet.
 */
export async function GET() {
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Tyler Mafi",
    "N:Mafi;Tyler;;;",
    "TITLE:Founder",
    "ORG:Mountain Connects",
    "EMAIL;TYPE=WORK:tyler@mountainconnects.com",
    "TEL;TYPE=CELL:+61468939113",
    "URL:https://www.mountainconnects.com",
    "NOTE:Connecting seasonal workers with ski resorts worldwide.",
    "END:VCARD",
    "",
  ].join("\r\n");

  return new NextResponse(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="tyler-mafi.vcf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
