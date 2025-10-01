// File: netlify/functions/cancelSlot.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { slotId, applicantId } = JSON.parse(event.body || "{}");

    if (!slotId || !applicantId) {
      return { statusCode: 400, body: "Missing slotId or applicantId" };
    }

    // 1️⃣ Verify that the slot belongs to this applicant and is currently booked
    const { data: slot, error: fetchError } = await supabase
      .from("viewings")
      .select("id, property_id, applicant_id, slot_start")
      .eq("id", slotId)
      .eq("applicant_id", applicantId)
      .eq("status", "booked")
      .single();

    if (fetchError || !slot) {
      return {
        statusCode: 400,
        body: "Rezervace nenalezena nebo již byla zrušena.",
      };
    }

    // 2️⃣ Release the slot
    const { error: updateError } = await supabase
      .from("viewings")
      .update({
        status: "available",
        applicant_id: null,
      })
      .eq("id", slotId);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      return { statusCode: 500, body: "Chyba při uvolňování slotu." };
    }

    // 3️⃣ Clear rental_inquiries.viewing_time
    const { error: inquiryError } = await supabase
      .from("rental_inquiries")
      .update({ viewing_time: null })
      .eq("client_id", applicantId)
      .eq("property_id", slot.property_id);

    if (inquiryError) {
      console.error("Error clearing rental_inquiries:", inquiryError);
      // don’t block cancellation, just log
    }

    // 4️⃣ (Optional) Send confirmation email
    try {
      const { data: applicant } = await supabase
        .from("applicants")
        .select("full_name, email")
        .eq("id", applicantId)
        .single();

      const { data: property } = await supabase
        .from("properties")
        .select("property_configuration, address")
        .eq("id", slot.property_id)
        .single();

      if (applicant && property) {
        const oAuth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );
        oAuth2Client.setCredentials({
          refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });

        const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

        const subject = `Zrušení rezervace: ${property.property_configuration} ${property.address}`;
        const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString(
          "base64"
        )}?=`;

        const formattedTime = new Date(slot.slot_start).toLocaleString(
          "cs-CZ",
          {
            timeZone: "Europe/Prague",
            dateStyle: "short",
            timeStyle: "short",
          }
        );

        const htmlBody = `
          <p>Dobrý den ${applicant.full_name},</p>
          <p>Vaše rezervace prohlídky byla zrušena.</p>
          <ul>
            <li><strong>Nemovitost:</strong> ${property.property_configuration} ${property.address}</li>
            <li><strong>Původní čas:</strong> ${formattedTime}</li>
          </ul>
          <p>Pokud si přejete vybrat nový termín, kontaktujte prosím svého makléře nebo použijte nový odkaz.</p>
          <p>S pozdravem,<br/>RE/MAX CZ tým</p>
        `;

        const emailLines = [
          `From: "Jana Bodakova" <jana.bodakova@re-max.cz>`,
          `To: ${applicant.email}`,
          `Subject: ${encodedSubject}`,
          `Content-Type: text/html; charset=UTF-8`,
          ``,
          htmlBody,
        ];
        const rawMessage = Buffer.from(emailLines.join("\n"))
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");

        await gmail.users.messages.send({
          userId: "me",
          requestBody: { raw: rawMessage },
        });

        console.log("📧 Cancellation email sent");
      }
    } catch (mailErr) {
      console.error("Email sending failed:", mailErr);
      // don’t break cancellation if email fails
    }

    return { statusCode: 200, body: "Rezervace byla úspěšně zrušena." };
  } catch (err) {
    console.error("Cancel error:", err);
    return { statusCode: 500, body: "Chyba serveru při rušení rezervace." };
  }
};

export { handler };
