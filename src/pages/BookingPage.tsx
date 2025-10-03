// File: src/pages/BookingPage.tsx
import "../App.css";
import { useEffect, useMemo, useState } from "react";
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
  slot_start: string; // ISO
  slot_end: string; // ISO
  status: "available" | "booked" | "cancelled";
}

export default function BookingPage() {
  const { propertyCode } = useParams<{ propertyCode: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") || searchParams.get("token") || "";

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [existingBooking, setExistingBooking] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byDate = slots.reduce<Record<string, Slot[]>>((acc, s) => {
      const start = dayjs.tz(s.slot_start, "Europe/Prague");
      if (start.isBefore(dayjs())) return acc; // hide past slots
      const key = start.format("DD/MM/YYYY");
      (acc[key] ||= []).push(s);
      return acc;
    }, {});
    Object.values(byDate).forEach((list) =>
      list.sort(
        (a, b) => dayjs(a.slot_start).valueOf() - dayjs(b.slot_start).valueOf()
      )
    );
    return byDate;
  }, [slots]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMessage(null);

      if (!propertyCode || !token) {
        setMessage("❌ Chybí identifikace (nemovitost nebo token).");
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

      // Optional: ensure it's sales
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

      // 2) Token must belong to this property (active token)
      const { data: tokenRow, error: tokErr } = await supabase
        .from("viewing_tokens")
        .select("id, applicant_id, used, property_id")
        .eq("token", token)
        .eq("property_id", property.id)
        .maybeSingle();

      if (tokErr || !tokenRow) {
        setMessage("❌ Odkaz je neplatný.");
        setLoading(false);
        return;
      }

      // (Policy: allow rebooking even if token was used—change later if needed)
      // if (tokenRow.used) { setMessage("❌ Odkaz již byl použit."); setLoading(false); return; }

      // 3) Existing booking for this applicant/property?
      const { data: existing } = await supabase
        .from("viewings")
        .select("slot_start")
        .eq("property_id", property.id)
        .eq("applicant_id", tokenRow.applicant_id)
        .eq("status", "booked")
        .order("slot_start", { ascending: true })
        .maybeSingle();

      if (existing?.slot_start) {
        const dt = dayjs(existing.slot_start).tz("Europe/Prague");
        setExistingBooking(
          `Máte rezervovaný termín prohlídky: ${dt.format(
            "DD/MM/YYYY"
          )} v ${dt.format(
            "HH:mm"
          )}. Pokud chcete změnit čas, vyberte prosím jiný z dostupných termínů níže.`
        );
      }

      // 4) Available slots for this property
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
        if ((!vData || vData.length === 0) && !existing) {
          setMessage("Momentálně nejsou k dispozici žádné volné termíny.");
        }
      }

      setLoading(false);
    })();
  }, [propertyCode, token]);

  const handleBooking = async (slotId: string) => {
    if (!token) {
      setMessage("❌ Chybí identifikace tokenu.");
      return;
    }
    try {
      const res = await fetch("/.netlify/functions/bookSlot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, token }),
      });

      if (res.ok) {
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
        setMessage(
          "✅ Váš čas byl úspěšně rezervován! Brzy obdržíte potvrzovací e-mail."
        );
      } else {
        const text = await res.text();
        setMessage("❌ Rezervace se nezdařila: " + text);
      }
    } catch (_err) {
      setMessage("❌ Rezervační požadavek selhal.");
    }
  };

  if (loading) return <div>Načítám dostupné sloty…</div>;

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
      {Object.keys(groups).length === 0 ? (
        <p>Žádné dostupné sloty.</p>
      ) : (
        Object.entries(groups).map(([date, daySlots]) => (
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
                const disabled = start.isBefore(dayjs());
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
                        backgroundColor: disabled ? "#9bbbe0" : "#0054a4",
                        marginLeft: 10,
                        padding: "6px 10px",
                        cursor: disabled ? "not-allowed" : "pointer",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                      }}
                      onClick={() => !disabled && handleBooking(slot.id)}
                      disabled={disabled}
                      aria-disabled={disabled}
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
