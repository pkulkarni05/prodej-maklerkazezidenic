// netlify/functions/bookSlot.ts  (SALES)
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Europe/Prague";
const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(s).trim()
  );

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "REMAX_USER",
    "REMAX_PASSWORD",
  ] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    return { statusCode: 500, body: `Missing env vars: ${missing.join(", ")}` };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  try {
    const { slotId, applicantId } = JSON.parse(event.body || "{}");
    if (!slotId || !applicantId) {
      return { statusCode: 400, body: "Missing slotId or applicantId" };
    }
    const applicantIdTrim = String(applicantId).trim();
    if (!isUuid(applicantIdTrim)) {
      return { statusCode: 400, body: "Invalid applicantId format" };
    }

    // Verify applicant exists (avoid FK issues)
    const { data: applicantRow, error: applicantErr } = await supabase
      .from("applicants")
      .select("id, full_name, email")
      .eq("id", applicantIdTrim)
      .maybeSingle();
    if (applicantErr)
      return {
        statusCode: 500,
        body: `Applicant lookup failed: ${applicantErr.message}`,
      };
    if (!applicantRow) return { statusCode: 400, body: "Unknown applicant" };

    // 1) Load slot
    const { data: slotData, error: slotError } = await supabase
      .from("viewings")
      .select("id, slot_start, slot_end, property_id, status")
      .eq("id", slotId)
      .single();

    if (slotError || !slotData)
      return { statusCode: 404, body: "Selected slot not found" };
    if (slotData.status !== "available")
      return { statusCode: 409, body: "Slot not available anymore" };

    const { property_id } = slotData;

    // 2) Free ALL prior bookings for this applicant+property
    const { error: freeErr } = await supabase
      .from("viewings")
      .update({ status: "available", applicant_id: null })
      .eq("applicant_id", applicantIdTrim)
      .eq("property_id", property_id)
      .eq("status", "booked");
    if (freeErr)
      return {
        statusCode: 500,
        body: `Failed to free prior booking(s): ${freeErr.message}`,
      };

    // 3) Book selected slot (no .limit(1) needed; we target by id)
    const { data: updated, error: updateError } = await supabase
      .from("viewings")
      .update({ status: "booked", applicant_id: applicantIdTrim })
      .eq("id", slotId)
      .eq("status", "available")
      .select("id, slot_start");
    if (updateError)
      return {
        statusCode: 500,
        body: `Database update failed: ${updateError.message}`,
      };
    if (!updated || updated.length === 0)
      return { statusCode: 409, body: "Slot not available anymore" };
    const newSlot = updated[0];

    // 4) Store TEXT (Prague wall-time) in sales_inquiries.viewing_time
    // Format like Rentals: "YYYY-MM-DD HH:mm:ss"
    const viewingTimeText = dayjs(newSlot.slot_start)
      .tz(TZ)
      .format("YYYY-MM-DD HH:mm:ss");
    await supabase
      .from("sales_inquiries")
      .update({ viewing_time: viewingTimeText })
      .eq("applicant_id", applicantIdTrim)
      .eq("property_id", property_id);

    // 5) Email confirmation — use the same TEXT (Prague)
    const { data: property } = await supabase
      .from("properties")
      .select("property_configuration, address")
      .eq("id", property_id)
      .single();

    if (applicantRow?.email && property) {
      const transporter = nodemailer.createTransport({
        host: "mail.re-max.cz",
        port: 587,
        secure: false,
        auth: {
          user: process.env.REMAX_USER,
          pass: process.env.REMAX_PASSWORD,
        },
      });

      const formattedTimeCz = dayjs
        .tz(viewingTimeText, TZ)
        .format("DD/MM/YYYY HH:mm");
      const subject = `Potvrzení rezervace: ${property.property_configuration} ${property.address}`;
      const html = `
        <p>Dobrý den${
          applicantRow.full_name ? ` ${escapeHtml(applicantRow.full_name)}` : ""
        },</p>
        <p>Potvrzuji rezervaci Vaší prohlídky:</p>
        <ul>
          <li><strong>Nemovitost:</strong> ${escapeHtml(
            property.property_configuration
          )} ${escapeHtml(property.address)}</li>
          <li><strong>Datum a čas:</strong> ${formattedTimeCz}</li>
        </ul>
        <p>S pozdravem,<br/>Jana Bodáková, RE/MAX Pro</p>
      `;

      await transporter.sendMail({
        from: `"Jana Bodáková" <jana.bodakova@re-max.cz>`,
        envelope: { from: process.env.REMAX_USER, to: applicantRow.email },
        to: applicantRow.email,
        subject,
        html,
      });
    }

    return { statusCode: 200, body: "Slot booked successfully" };
  } catch (err: any) {
    console.error("Booking error:", err);
    return { statusCode: 500, body: err?.message || "Internal server error" };
  }
};

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
