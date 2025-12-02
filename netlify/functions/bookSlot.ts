// File: netlify/functions/bookSlot.ts  (SALES; same method as Rentals)
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dayjs from "dayjs";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  REMAX_USER,
  REMAX_PASSWORD,
  FINANCE_LINK_SERVICE_URL,
  FINANCE_FORM_BASE_URL,
  IMG_BASE,
} = process.env;

const supabase = createClient(
  SUPABASE_URL as string,
  SUPABASE_SERVICE_ROLE_KEY as string
);

type PropertyEmailData = {
  address: string | null;
  property_configuration: string | null;
  docs_link: string | null;
  video_link: string | null;
  advert_link: string | null;
  map_link: string | null;
};

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Branded HTML email for fixed-time viewing confirmation + finance link.
 * Styling + footer follows sendViewingEmail.ts (composeHtmlViewingConfirmationEmail),
 * with an extra CTA button for the finance form.
 */
function composeHtmlViewingConfirmationWithFinanceEmail(
  p: PropertyEmailData,
  viewingTime: string,
  financeUrl: string | null
) {
  const address = escapeHtml(p.address || "");
  const configuration = escapeHtml(p.property_configuration || "");
  const docs = p.docs_link || "";
  const video = p.video_link || "";
  const advert = p.advert_link || "";
  const map = p.map_link || "";

  const addressFragment = map
    ? `<a href="${map}" target="_blank" rel="noopener noreferrer" style="color:#1f497d;text-decoration:underline;font-weight:bold">${address}</a>`
    : address;

  const btnStyle =
    "display:inline-block;background-color:#ff0000;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:15px";

  const base = IMG_BASE || "";
  const photoUrl = base ? `${base}/jana.jpg` : "";
  const brandUrl = base ? `${base}/BrandStrip-Small.jpeg` : "";

  // Base confirmation sentence (same tone as existing viewing confirmation)
  const confirmationSentence = `
    <p style="color:#2e4057">
      velmi děkuji za Váš zájem o byt ${configuration} na adrese ${addressFragment}. 
      Vaše prohlídka je pro Vás rezervována na <strong>${escapeHtml(
        viewingTime
      )}</strong>.
    </p>
  `;

  // Finance CTA block – only if we have a URL
  const financeBlock = financeUrl
    ? `
    <p style="color:#2e4057">
      Abychom se mohli na prohlídku co nejlépe připravit a zvolit pro Vás vhodnou strategii financování,
      prosím o vyplnění krátkého finančního dotazníku. Zvládnete jej během několika minut a pomůže nám
      rychleji vyhodnotit Vaše možnosti.
    </p>
    <div style="margin:12px 0">
      <a href="${financeUrl}" target="_blank" rel="noopener noreferrer" style="${btnStyle}">
        💰 Vyplnit finanční dotazník
      </a>
    </div>
    <p style="color:#2e4057;font-size:14px">
      Pokud by tlačítko nefungovalo, můžete použít tento odkaz:<br/>
      <a href="${financeUrl}" target="_blank" rel="noopener noreferrer" style="color:#1f497d;text-decoration:underline">
        ${financeUrl}
      </a>
    </p>
  `
    : "";

  const buttons: string[] = [];
  if (docs) {
    buttons.push(
      `<div style="margin-top:10px"><a href="${docs}" target="_blank" rel="noopener noreferrer" style="${btnStyle}">Detailní dokumenty</a></div>`
    );
  }
  if (video) {
    buttons.push(
      `<div style="margin-top:10px"><a href="${video}" target="_blank" rel="noopener noreferrer" style="${btnStyle}">Videoprohlídka</a></div>`
    );
  }
  if (advert) {
    buttons.push(
      `<div style="margin-top:10px"><a href="${advert}" target="_blank" rel="noopener noreferrer" style="${btnStyle}">Zobrazit inzerát</a></div>`
    );
  }

  const innerHtml = `
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#2e4057">
    <p style="color:#2e4057">Dobrý den,</p>

    ${confirmationSentence}

    ${financeBlock}

    <p style="color:#2e4057">
      Mým cílem je, aby byl celý proces prodeje maximálně transparentní, efektivní a pohodlný,
      proto Vám již nyní posílám všechny důležité informace. Níže najdete přímé odkazy na materiály,
      které si můžete pohodlně prostudovat ještě před prohlídkou:
    </p>

    ${buttons.join("")}

    <p style="margin-top:16px;color:#2e4057">
      A pokud Vás zajímá, co dalšího momentálně nabízím v Brně a okolí, navštivte moje stránky:
      <a href="https://www.remax-czech.cz/reality/nemovitosti-maklere/9229/jana-bodakova/"
         target="_blank" rel="noopener noreferrer"
         style="color:#1f497d;text-decoration:underline;font-weight:bold">
         Prohlédnout další nemovitosti
      </a>
    </p>

    <p style="color:#2e4057">
      Pro nejčerstvější novinky, tipy a připravované nemovitosti mě můžete sledovat i na:
      &nbsp;<a href="https://www.facebook.com/jaknabydlenivbrne" target="_blank" rel="noopener noreferrer" style="color:#1f497d;text-decoration:none;font-weight:bold">Facebook</a> |
      <a href="https://www.instagram.com/jak_na_bydleni/" target="_blank" rel="noopener noreferrer" style="color:#1f497d;text-decoration:none;font-weight:bold">Instagram</a> |
      <a href="https://www.linkedin.com/in/jbodakova/" target="_blank" rel="noopener noreferrer" style="color:#1f497d;text-decoration:none;font-weight:bold">LinkedIn</a>
    </p>

    <p style="color:#2e4057">V případě jakýchkoli dotazů jsem Vám plně k dispozici.</p>
    <p style="color:#2e4057">Těším se na osobní setkání při prohlídkovém dni.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
          style="width:100%;max-width:640px;margin-top:12px;font-size:0;line-height:0">
      <tr>
        <td style="width:96px;vertical-align:top;padding:6px 8px 6px 0">
          ${
            photoUrl
              ? `<img src="${photoUrl}" alt="Jana Bodáková" width="96"
                style="display:block;border:0;outline:none;border-radius:6px;max-width:100%;height:auto" />`
              : ""
          }
        </td>
        <td style="vertical-align:top;padding:6px 0;font-size:15px;line-height:1.6;color:#2e4057">
          <div>
            <strong style="color:#1f497d">Jana Bodáková</strong><br/>
            Vaše realitní makléřka<br/>
            M: +420&nbsp;736&nbsp;780&nbsp;983<br/>
            E: <a href="mailto:jana.bodakova@re-max.cz" style="color:#1f497d;text-decoration:none">jana.bodakova@re-max.cz</a>
          </div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:8px 0 0 0;text-align:left">
          ${
            brandUrl
              ? `<img src="${brandUrl}" alt="RE/MAX Brand" width="300"
                style="display:inline-block;border:0;outline:none;max-width:100%;height:auto"/>`
              : ""
          }
        </td>
      </tr>
    </table>
  </div>
  `.trim();

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       bgcolor="#1f497d" style="background-color:#1f497d;width:100%">
  <tr>
    <td align="center" valign="top" style="padding:6px;font-size:0;line-height:0">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
             bgcolor="#ffffff"
             style="border-collapse:separate;width:100%;max-width:600px;background-color:#ffffff;border-spacing:0">
        <tr>
          <td style="padding:20px">
            ${innerHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `.trim();
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { slotId, applicantId } = JSON.parse(event.body || "{}");

    if (!slotId || !applicantId) {
      return { statusCode: 400, body: "Missing slotId or applicantId" };
    }

    // 1) Get the slot (id, property)
    const { data: slotData, error: slotError } = await supabase
      .from("viewings")
      .select("id, slot_start, property_id")
      .eq("id", slotId)
      .single();

    if (slotError || !slotData) {
      return { statusCode: 404, body: "Selected slot not found" };
    }

    const { property_id } = slotData;

    // 2) If the applicant already has a booking for this property, free it (same as Rentals: free one)
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

    // 3) Book the new slot (target by id + only if still available)
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

    // 4) Store the booked time on *sales_inquiries.viewing_time* (TEXT)
    await supabase
      .from("sales_inquiries")
      .update({ viewing_time: newSlot.slot_start })
      .eq("applicant_id", applicantId)
      .eq("property_id", property_id);

    // 5) Fetch applicant & property for the confirmation email
    const { data: applicant } = await supabase
      .from("applicants")
      .select("full_name, email")
      .eq("id", applicantId)
      .single();

    const { data: property } = await supabase
      .from("properties")
      .select(
        "property_configuration, address, property_code, docs_link, video_link, advert_link, map_link"
      )
      .eq("id", property_id)
      .single();

    // 6) Generate finance-form link via existing admin function (if configured)
    let financeUrl: string | null = null;

    if (
      FINANCE_LINK_SERVICE_URL &&
      FINANCE_FORM_BASE_URL &&
      property?.property_code
    ) {
      try {
        const res = await fetch(FINANCE_LINK_SERVICE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicant_id: applicantId,
            property_code: property.property_code,
            base_url: FINANCE_FORM_BASE_URL,
            // optional: expires_in_days: 7,
          }),
        });

        const txt = await res.text();
        let data: any = null;
        try {
          data = txt ? JSON.parse(txt) : null;
        } catch (e) {
          console.error("bookSlot:createFinanceFormLink JSON parse error:", e);
        }

        if (!res.ok || !data?.ok || !data?.url) {
          console.error(
            "bookSlot:createFinanceFormLink failed:",
            res.status,
            txt
          );
        } else {
          financeUrl = data.url as string;
        }
      } catch (e) {
        console.error("bookSlot:createFinanceFormLink error:", e);
      }
    } else {
      if (!FINANCE_LINK_SERVICE_URL || !FINANCE_FORM_BASE_URL) {
        console.warn(
          "Finance link envs missing – FINANCE_LINK_SERVICE_URL and/or FINANCE_FORM_BASE_URL are not set. Email will be sent without finance link."
        );
      }
    }

    // 7) Send email (branded, with optional finance CTA)
    if (applicant && property) {
      try {
        const smtpUser = (REMAX_USER || "").trim();
        const smtpPass = (REMAX_PASSWORD || "").trim();

        if (!smtpUser || !smtpPass) {
          console.error(
            "BOOK SLOT EMAIL ERROR: Missing SMTP credentials (REMAX_USER/REMAX_PASSWORD)."
          );
        } else {
          const transporter = nodemailer.createTransport({
            host: "mail.re-max.cz",
            port: 587,
            secure: false,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          const formattedTime = dayjs(newSlot.slot_start).format(
            "DD/MM/YYYY HH:mm"
          );

          const propertyData: PropertyEmailData = {
            address: property.address ?? null,
            property_configuration: property.property_configuration ?? null,
            docs_link: property.docs_link ?? null,
            video_link: property.video_link ?? null,
            advert_link: property.advert_link ?? null,
            map_link: property.map_link ?? null,
          };

          const htmlBody = composeHtmlViewingConfirmationWithFinanceEmail(
            propertyData,
            formattedTime,
            financeUrl
          );

          // Subject explicitly mentions finance form to distinguish from other auto-responses
          const subject =
            `Potvrzení termínu prohlídky + odkaz na finanční dotazník – ${
              property.property_configuration || ""
            } ${property.address || ""}`.trim();

          await transporter.sendMail({
            from: `"Jana Bodáková" <${smtpUser}>`,
            envelope: { from: smtpUser, to: applicant.email },
            to: applicant.email,
            subject,
            html: htmlBody,
          });
        }
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
