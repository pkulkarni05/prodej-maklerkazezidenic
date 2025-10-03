// netlify/functions/bookSlot.ts  (SALES, no token)
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = "Europe/Prague";

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
  if (missing.length)
    return {
      statusCode: 500,
      body: `Missing environment variables: ${missing.join(", ")}`,
    };

  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  try {
    const { slotId, applicantId } = JSON.parse(event.body || "{}");
    if (!slotId || !applicantId) {
      return { statusCode: 400, body: "Missing slotId or applicantId" };
    }

    // 1) Load slot
    const { data: slotData, error: slotError } = await supabase
      .from("viewings")
      .select("id, slot_start, property_id, status")
      .eq("id", slotId)
      .single();

    if (slotError || !slotData)
      return { statusCode: 404, body: "Selected slot not found" };
    if (slotData.status !== "available")
      return { statusCode: 400, body: "Slot not available anymore" };

    const { property_id } = slotData;

    // 2) Free any previous booking for this applicant+property
    const { data: existing } = await supabase
      .from("viewings")
      .select("id")
      .eq("applicant_id", applicantId)
      .eq("property_id", property_id)
      .eq("status", "booked")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("viewings")
        .update({ status: "available", applicant_id: null })
        .eq("id", existing.id);
    }

    // 3) Book the selected slot (atomic)
    const { data: updated, error: updateError } = await supabase
      .from("viewings")
      .update({ status: "booked", applicant_id: applicantId })
      .eq("id", slotId)
      .eq("status", "available")
      .select("id, slot_start")
      .limit(1);

    if (updateError) {
      console.error("UPDATE_ERROR", updateError);
      return {
        statusCode: 500,
        body: `Database update failed: ${updateError.message}`,
      };
    }

    if (!updated || updated.length === 0)
      return { statusCode: 400, body: "Slot not available anymore" };
    const newSlot = updated[0];

    // 4) Update sales_inquiries.viewing_time
    await supabase
      .from("sales_inquiries")
      .update({ viewing_time: newSlot.slot_start })
      .eq("applicant_id", applicantId)
      .eq("property_id", property_id);

    // 5) Email confirmation (render in Prague)
    const [{ data: applicant }, { data: property }] = await Promise.all([
      supabase
        .from("applicants")
        .select("full_name, email")
        .eq("id", applicantId)
        .single(),
      supabase
        .from("properties")
        .select("property_configuration, address")
        .eq("id", property_id)
        .single(),
    ]);

    if (applicant && property && applicant.email) {
      const transporter = nodemailer.createTransport({
        host: "mail.re-max.cz",
        port: 587,
        secure: false,
        auth: {
          user: process.env.REMAX_USER,
          pass: process.env.REMAX_PASSWORD,
        },
      });

      const formattedTime = dayjs(newSlot.slot_start)
        .tz(TZ)
        .format("DD/MM/YYYY HH:mm");
      const subject = `Potvrzení rezervace: ${property.property_configuration} ${property.address}`;
      const html = `
        <p>Dobrý den${
          applicant.full_name ? ` ${escapeHtml(applicant.full_name)}` : ""
        },</p>
        <p>Potvrzuji rezervaci Vaší prohlídky:</p>
        <ul>
          <li><strong>Nemovitost:</strong> ${escapeHtml(
            property.property_configuration
          )} ${escapeHtml(property.address)}</li>
          <li><strong>Datum a čas:</strong> ${formattedTime}</li>
        </ul>
        <p>S pozdravem,<br/>Jana Bodáková, RE/MAX Pro</p>
      `;

      await transporter.sendMail({
        from: `"Jana Bodáková" <jana.bodakova@re-max.cz>`,
        envelope: { from: process.env.REMAX_USER, to: applicant.email },
        to: applicant.email,
        subject,
        html,
      });
    }

    return { statusCode: 200, body: "Slot booked successfully" };
  } catch (err) {
    console.error("Booking error:", err);
    return { statusCode: 500, body: "Internal server error" };
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
