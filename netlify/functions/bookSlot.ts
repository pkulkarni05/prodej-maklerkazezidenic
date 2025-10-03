// File: netlify/functions/bookSlot.ts   <-- SALES version (token-based, derives applicantId)
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dayjs from "dayjs";

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Ensure required env vars exist for functions (frontend VITE_* do not apply here)
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "REMAX_USER",
    "REMAX_PASSWORD",
  ] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    return {
      statusCode: 500,
      body: `Missing environment variables: ${missing.join(", ")}`,
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  try {
    const { slotId, token } = JSON.parse(event.body || "{}");

    // We now only require slotId + token (applicantId is derived from token)
    if (!slotId || !token) {
      return { statusCode: 400, body: "Missing slotId or token" };
    }

    // 1) Load the slot → property_id (and ensure it's still available)
    const { data: slotData, error: slotError } = await supabase
      .from("viewings")
      .select("id, slot_start, property_id, status")
      .eq("id", slotId)
      .single();

    if (slotError || !slotData) {
      return { statusCode: 404, body: "Selected slot not found" };
    }
    if (slotData.status !== "available") {
      return { statusCode: 400, body: "Slot not available anymore" };
    }

    const { property_id } = slotData;

    // 2) Validate token for this property and derive applicantId
    const { data: tokenRow, error: tokenError } = await supabase
      .from("viewing_tokens")
      .select("id, used, applicant_id, is_active, revoked")
      .eq("property_id", property_id)
      .eq("token", token)
      .single();

    if (tokenError || !tokenRow) {
      return { statusCode: 400, body: "Invalid token" };
    }
    // Allow rebooking with the same link:
    // Only block if the token was explicitly revoked or inactive.
    if (tokenRow.revoked || tokenRow.is_active === false) {
      return { statusCode: 400, body: "Token not active" };
    }

    const applicantId = tokenRow.applicant_id;
    if (!applicantId) {
      return {
        statusCode: 400,
        body: "Unable to resolve applicant from token",
      };
    }

    // 3) If this applicant already booked a slot for the same property, free the old one
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

    // 4) Book the selected slot (atomic: only if still available)
    const { data: updatedSlots, error: updateError } = await supabase
      .from("viewings")
      .update({
        status: "booked",
        applicant_id: applicantId,
      })
      .eq("id", slotId)
      .eq("status", "available")
      .select("id, slot_start");

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return { statusCode: 500, body: "Database update failed" };
    }
    if (!updatedSlots || updatedSlots.length === 0) {
      return { statusCode: 400, body: "Slot not available anymore" };
    }

    const newSlot = updatedSlots[0];

    // 5) Update sales_inquiries.viewing_time
    await supabase
      .from("sales_inquiries")
      .update({ viewing_time: newSlot.slot_start })
      .eq("applicant_id", applicantId)
      .eq("property_id", property_id);

    // 6) Mark token as used (single-use links)
    await supabase
      .from("viewing_tokens")
      .update({ used: true })
      .eq("id", tokenRow.id);

    // 7) Confirmation email
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

    if (applicant && property) {
      try {
        const transporter = nodemailer.createTransport({
          host: "mail.re-max.cz",
          port: 587,
          secure: false,
          auth: {
            user: process.env.REMAX_USER,
            pass: process.env.REMAX_PASSWORD,
          },
        });

        const subject = `Potvrzení rezervace: ${property.property_configuration} ${property.address}`;
        const formattedTime = dayjs(newSlot.slot_start).format(
          "DD/MM/YYYY HH:mm"
        );

        const htmlBody = `
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
          <p>Pokud by Vás do té doby napadly jakékoli otázky, neváhejte nás prosím kontaktovat.<br/>Těšíme se na Vás!</p>
          <p>S pozdravem,<br/>Jana Bodáková, RE/MAX Pro</p>
        `;

        await transporter.sendMail({
          from: `"Jana Bodáková" <jana.bodakova@re-max.cz>`,
          envelope: { from: process.env.REMAX_USER, to: applicant.email },
          to: applicant.email,
          subject,
          html: htmlBody,
        });
      } catch (mailErr) {
        console.error("Email sending failed:", mailErr);
      }
    }

    return { statusCode: 200, body: "Slot booked successfully" };
  } catch (err) {
    console.error("Booking error:", err);
    return { statusCode: 500, body: "Internal server error" };
  }
};
