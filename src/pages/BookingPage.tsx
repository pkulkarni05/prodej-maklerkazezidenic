// File: src/pages/BookingPage.tsx  (SALES variant using ?applicant=<ID>)
import "../App.css";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import KulkarniConsultingNote from "../components/KulkarniConsultingNote";
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Europe/Prague");

type UUID = string;

interface Slot {
  id: UUID;
  slot_start: string; // DB timestamptz as string
  slot_end: string;
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
    async function fetchSlots() {
      if (!propertyCode || !applicantId) {
        setMessage("❌ Chybí identifikace nemovitosti nebo žadatele.");
        setLoading(false);
        return;
      }

      // Property
      const { data: property, error: propError } = await supabase
        .from("properties")
        .select("id, business_type")
        .eq("property_code", propertyCode)
        .single();

      if (propError || !property) {
        setMessage("❌ Nemovitost nebyla nalezena.");
        setLoading(false);
        return;
      }

      // (Optional) ensure Sales property
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

      // Banner: read TEXT from sales_inquiries.viewing_time (mirrors Rentals approach)
      const { data: inquiry } = await supabase
        .from("sales_inquiries")
        .select("viewing_time")
        .eq("applicant_id", applicantId)
        .eq("property_id", property.id)
        .maybeSingle();

      if (inquiry?.viewing_time) {
        const dt = dayjs(inquiry.viewing_time).tz("Europe/Prague");
        setExistingBooking(
          `Máte rezervovaný termín prohlídky: ${dt.format(
            "DD/MM/YYYY"
          )} v ${dt.format(
            "HH:mm"
          )}. Pokud chcete změnit čas, vyberte prosím jiný z dostupných termínů níže.`
        );
      }

      // Available slots (render in Prague)
      const { data, error } = await supabase
        .from("viewings")
        .select("id, slot_start, slot_end, status")
        .eq("property_id", property.id)
        .eq("status", "available")
        .order("slot_start", { ascending: true });

      if (error) {
        console.error(error);
        setMessage("❌ Chyba při načítání časů.");
      } else {
        setSlots(data || []);
      }
      setLoading(false);
    }

    fetchSlots();
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
        setMessage(
          "✅ Váš čas byl úspěšně rezervován! Brzy obdržíte potvrzovací e-mail."
        );
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
      } else {
        const text = await res.text();
        setMessage("❌ Rezervace se nezdařila: " + text);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Rezervační požadavek selhal.");
    }
  };

  if (loading) return <div>Načítám dostupné sloty…</div>;

  // Group by date (Prague)
  const groupedSlots = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const dateKey = dayjs
      .tz(slot.slot_start, "Europe/Prague")
      .format("DD/MM/YYYY");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});

  return (
    <div style={{ padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Rezervace prohlídky</h1>
        <img
          src="/logo_pro.png"
          alt="Logo"
          style={{ height: "100px", objectFit: "contain" }}
        />
      </div>

      {message && (
        <div style={{ marginBottom: "15px", color: "blue" }}>{message}</div>
      )}

      {existingBooking && (
        <div style={{ marginBottom: "20px", fontWeight: "bold" }}>
          {existingBooking}
        </div>
      )}

      {slots.length === 0 ? (
        <p>Žádné dostupné sloty.</p>
      ) : (
        Object.entries(groupedSlots).map(([date, daySlots]) => (
          <div
            key={date}
            style={{
              border: "2px solid #0054a4",
              borderRadius: "8px",
              padding: "10px",
              marginBottom: "20px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#0054a4" }}>{date}</h3>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {daySlots.map((slot) => (
                <li key={slot.id} style={{ marginBottom: "10px" }}>
                  {dayjs.tz(slot.slot_start, "Europe/Prague").format("HH:mm")} –{" "}
                  {dayjs.tz(slot.slot_end, "Europe/Prague").format("HH:mm")}
                  <button
                    style={{
                      backgroundColor: "#0054a4",
                      marginLeft: "10px",
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleBooking(slot.id)}
                  >
                    Rezervovat
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      <KulkarniConsultingNote />
    </div>
  );
}
