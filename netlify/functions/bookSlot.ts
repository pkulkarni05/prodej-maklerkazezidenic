// File: netlify/functions/bookSlot.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dayjs from "dayjs";

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

    // 1️⃣ Get property_id of the selected slot
    const { data: slotData, error: slotError } = await supabase
      .from("viewings")
      .select("id, slot_start, property_id")
      .eq("id", slotId)
      .single();

    if (slotError || !slotData) {
      return { statusCode: 404, body: "Selected slot not found" };
    }

    const { property_id, slot_start } = slotData;

    // 2️⃣ Check if applicant already has a booking for this property
    const { data: existing } = await supabase
      .from("viewings")
      .select("id")
      .eq("applicant_id", applicantId)
      .eq("property_id", property_id)
      .eq("status", "booked")
      .maybeSingle();

    if (existing) {
      // Free up old slot
      await supabase
        .from("viewings")
        .update({ status: "available", applicant_id: null })
        .eq("id", existing.id);
    }

    // 3️⃣ Book the new slot
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
      console.error("Supabase error:", updateError);
      return { statusCode: 500, body: "Database update failed" };
    }

    if (!updatedSlots || updatedSlots.length === 0) {
      return { statusCode: 400, body: "Slot not available anymore" };
    }

    const newSlot = updatedSlots[0];

    // 4️⃣ Update rental_inquiries.viewing_time
    await supabase
      .from("rental_inquiries")
      .update({ viewing_time: newSlot.slot_start })
      .eq("client_id", applicantId)
      .eq("property_id", property_id);

    // 5️⃣ Fetch applicant + property details for confirmation email
    const { data: applicant } = await supabase
      .from("applicants")
      .select("full_name, email")
      .eq("id", applicantId)
      .single();

    const { data: property } = await supabase
      .from("properties")
      .select("property_configuration, address")
      .eq("id", property_id)
      .single();

    if (applicant && property) {
      try {
        // ✅ Setup Nodemailer with remax-czech SMTP
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
          <p>Dobrý den,</p>
          <p>Potvrzuji rezervaci Vaší prohlídky:</p>
          <ul>
            <li><strong>Nemovitost:</strong> ${property.property_configuration} ${property.address}</li>
            <li><strong>Datum a čas:</strong> ${formattedTime}</li>
          </ul>
          <p>Pokud by Vás do té doby napadly jakékoli otázky, neváhejte nás prosím kontaktovat.<br/>Těšíme se na Vás!</p>
          <p>S pozdravem,<br/>Jana Bodáková, RE/MAX Pro</p>
        `;

        await transporter.sendMail({
          from: `"Jana Bodakova" <jana.bodakova@re-max.cz>`,
          envelope: {
            from: process.env.REMAX_USER, // actual SMTP login for SPF/DKIM
            to: applicant.email,
          },
          to: applicant.email,
          subject,
          html: htmlBody,
        });

        console.log("📧 Confirmation email sent");
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

export { handler };
