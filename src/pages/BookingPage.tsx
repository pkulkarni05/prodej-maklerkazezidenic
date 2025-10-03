// src/pages/BookingPage.tsx  (SALES, uses ?applicant=<ID>)
import "../App.css";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Europe/Prague");

type UUID = string;

interface Slot {
  id: UUID;
  slot_start: string; // timestamptz from DB
  slot_end: string; // timestamptz from DB
  status: "available" | "booked" | "cancelled";
}

export default function BookingPage() {
  const { propertyCode } = useParams<{ propertyCode: string }>();
  const [searchParams] = useSearchParams();
  const applicantId = (searchParams.get("applicant") || "").trim();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [existingBooking, setExistingBooking] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMessage(null);

      if (!propertyCode || !applicantId) {
        setMessage("❌ Chybí identifikace (nemovitost nebo žadatel).");
        setLoading(false);
        return;
      }

      // 1) Property by code
      const { data: property, error: propErr } = await supabase
        .from("properties")
        .select("id, property_code, business_type")
        .eq("property_code", propertyCode)
        .single();

      if (propErr || !property) {
        setMessage("❌ Nemovitost nebyla nalezena.");
        setLoading(false);
        return;
      }

      // Optional: ensure this is a Sales property
      if (
        property.business_type &&
        !["prodej", "sale"].includes(
          String(property.business_type).toLowerCase()
        )
      ) {
        setMessage("❌ Tento odkaz neodpovídá prodeji nemovitosti.");
        setLoading(false);
        return;
      }

      // 2) Existing booking banner — read TEXT from sales_inquiries
      const { data: salesInquiry } = await supabase
        .from("sales_inquiries")
        .select("viewing_time")
        .eq("applicant_id", applicantId)
        .eq("property_id", property.id)
        .maybeSingle();

      if (salesInquiry?.viewing_time) {
        // TEXT saved as Prague wall-time "YYYY-MM-DD HH:mm:ss"
        const dt = dayjs.tz(salesInquiry.viewing_time, "Europe/Prague");
        setExistingBooking(
          `Máte rezervovaný termín prohlídky: ${dt.format(
            "DD/MM/YYYY"
          )} v ${dt.format(
            "HH:mm"
          )}. Pokud chcete změnit čas, vyberte prosím jiný z dostupných termínů níže.`
        );
      }

      // 3) Available slots for this property (render in Prague on the fly)
      const { data: vData, error: vErr } = await supabase
        .from("viewings")
        .select("id, slot_start, slot_end, status")
        .eq("property_id", property.id)
        .eq("status", "available")
        .order("slot_start", { ascending: true });

      if (vErr) {
        setMessage("❌ Chyba při načítání časů.");
      } else {
        setSlots(vData || []);
        if ((!vData || vData.length === 0) && !salesInquiry?.viewing_time) {
          setMessage("Momentálně nejsou k dispozici žádné volné termíny.");
        }
      }

      setLoading(false);
    })();
  }, [propertyCode, applicantId]);

  const handleBooking = async (slotId: string) => {
    if (!applicantId) {
      setMessage("❌ Chybí identifikace žadatele.");
      return;
    }
    try {
      const res = await fetch("/.netlify/functions/bookSlot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, applicantId }),
      });

      if (res.ok) {
        // Optimistic UI: remove the chosen slot and show success
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
        setMessage(
          "✅ Váš čas byl úspěšně rezervován! Brzy obdržíte potvrzovací e-mail."
        );
        // We intentionally let the banner refresh on next load; it reads from sales_inquiries.viewing_time
      } else {
        const text = await res.text();
        setMessage("❌ Rezervace se nezdařila: " + text);
      }
    } catch (_err) {
      setMessage("❌ Rezervační požadavek selhal.");
    }
  };

  if (loading) return <div>Načítám dostupné sloty…</div>;

  // Group by Prague date (same approach as Rentals)
  const groupedSlots = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const dateKey = dayjs
      .tz(slot.slot_start, "Europe/Prague")
      .format("DD/MM/YYYY");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});

  return (
    <div style={{ padding: 20, maxWidth: 820, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>Rezervace prohlídky</h1>
        <img
          src="/logo_pro.png"
          alt="Logo"
          style={{ height: 80, objectFit: "contain" }}
        />
      </div>

      {/* Messages */}
      {message && (
        <div
          style={{
            marginTop: 12,
            marginBottom: 16,
            color: message.startsWith("✅") ? "green" : "#0b64d8",
          }}
        >
          {message}
        </div>
      )}

      {existingBooking && (
        <div
          style={{
            marginBottom: 20,
            fontWeight: 600,
            background: "#f1f6ff",
            border: "1px solid #cfe3ff",
            padding: "10px 12px",
            borderRadius: 8,
          }}
        >
          {existingBooking}
        </div>
      )}

      {/* Slots */}
      {slots.length === 0 ? (
        <p>Žádné dostupné sloty.</p>
      ) : (
        Object.entries(groupedSlots).map(([date, daySlots]) => (
          <div
            key={date}
            style={{
              border: "2px solid #0054a4",
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              backgroundColor: "#f9f9f9",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#0054a4" }}>{date}</h3>
            <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
              {daySlots.map((slot) => {
                const start = dayjs.tz(slot.slot_start, "Europe/Prague");
                const end = dayjs.tz(slot.slot_end, "Europe/Prague");
                return (
                  <li
                    key={slot.id}
                    style={{
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      {start.format("HH:mm")} – {end.format("HH:mm")}
                    </span>
                    <button
                      style={{
                        backgroundColor: "#0054a4",
                        marginLeft: 10,
                        padding: "6px 10px",
                        cursor: "pointer",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                      }}
                      onClick={() => handleBooking(slot.id)}
                    >
                      Rezervovat
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
