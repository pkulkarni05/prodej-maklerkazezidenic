// File: src/pages/PropertyRentalForm.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ApplicantSection from "../components/ApplicantSection";
import RentalDetailsSection from "../components/RentalDetailsSection";
import { defaultFormData, type FormDataType } from "../types/form";
import "../App.css";
import emailjs from "@emailjs/browser";

export default function PropertyRentalForm() {
  const { propertyCode } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormDataType>(defaultFormData);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch property data
  useEffect(() => {
    async function fetchProperty() {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("property_code", propertyCode)
        .single();

      console.log("Supabase fetch result:", { data, error });

      if (error || !data) {
        setProperty(null);
      } else {
        setProperty(data);
      }
      setLoading(false);
    }
    fetchProperty();
  }, [propertyCode]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, type, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation (unchanged)
    if (!formData.jmeno || !/^[A-Za-zÀ-ž\s\-']{2,}$/.test(formData.jmeno)) {
      alert("Zadejte platné jméno.");
      return;
    }
    if (!formData.telefon || !/^\+?[0-9\s\-]{6,20}$/.test(formData.telefon)) {
      alert("Zadejte platné telefonní číslo.");
      return;
    }
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      alert("Zadejte platný email.");
      return;
    }
    if (!formData.gdprConsent) {
      alert("Musíte souhlasit se zpracováním osobních údajů.");
      return;
    }

    if (formData.dalsiUzivatele === "Ano") {
      const count = parseInt(formData.dalsiUzivatelePocet || "0", 10);
      const details = [];
      for (let i = 0; i < count; i++) {
        details.push(
          `Osoba ${i + 1}: Věk: ${formData[`vek_${i}`] || ""}, Zaměstnání: ${
            formData[`zamestnani_${i}`] || ""
          }`
        );
      }
      formData.dalsiUzivateleDetaily = details.join("\n");
    }

    // ✅ Step 1: Send Email
    try {
      await emailjs.send(
        "service_p3fe37b",
        "template_jkdzxv4",
        {
          ...formData,
          property_code: property.property_code,
          full_address: `${property.property_configuration} ${property.address}`,
          //property_address: property.address,
          //property_configuration: property.property_configuration,
        },
        "I3PK3ZMDK5KDBbG79"
      );

      // ✅ Step 2: Silent DB insert (fallback data persistence)
      try {
        const { data: applicantData, error: applicantError } = await supabase
          .from("applicants")
          .insert({
            full_name: formData.jmeno,
            permanent_address: formData.trvalyPobyt,
            actual_address: formData.skutecneBydliste,
            phone: formData.telefon,
            email: formData.email,
            has_criminal_record: formData.trestniRejstrik === "Ano",
            is_in_insolvency: formData.insolvence === "Ano",
            is_under_exekuce: formData.exekuce === "Ano",
            agreed_to_gdpr: formData.gdprConsent,
          })
          .select()
          .single();

        if (applicantError) throw applicantError;
        const applicantId = applicantData.id;

        const { data: inquiryData, error: inquiryError } = await supabase
          .from("rental_inquiries")
          .insert({
            client_id: applicantId,
            property_id: property.id,
            move_in_date: formData.terminNastehovani,
            desired_rental_duration: formData.pozadovanaDelka,
            has_pets: formData.domaciZvirata !== "Bez zvířat",
            is_smoker: formData.kurak === "Ano",
            deposit_agreed: formData.kauce === "Ano",
            other_users: formData.dalsiUzivatele,
            other_users_count: parseInt(
              formData.dalsiUzivatelePocet || "0",
              10
            ),
            other_users_details: formData.dalsiUzivateleDetaily || null,
            previous_landlord_contact: formData.kontaktNaMajitele || null,
            last_rent_duration: formData.delkaPronajmu || null,
            special_requests: formData.pozadavky || null,
            about_you: formData.oVas || null,
            submitted_at: formData.datum || new Date().toISOString(),
          })
          .select()
          .single();

        if (inquiryError) throw inquiryError;
        const inquiryId = inquiryData.id;

        if (formData.dalsiUzivatele === "Ano") {
          const count = parseInt(formData.dalsiUzivatelePocet || "0", 10);
          const coApplicants = [];
          for (let i = 0; i < count; i++) {
            const age = formData[`vek_${i}`];
            const occupation = formData[`zamestnani_${i}`];
            if (age) {
              coApplicants.push({
                inquiry_id: inquiryId,
                age,
                occupation: occupation || null,
              });
            }
          }
          if (coApplicants.length > 0) {
            const { error: coError } = await supabase
              .from("co_applicants")
              .insert(coApplicants);
            if (coError) throw coError;
          }
        }

        if (formData.domaciZvirata && formData.domaciZvirata !== "Bez zvířat") {
          const { error: petsError } = await supabase.from("pets").insert({
            inquiry_id: inquiryId,
            type: formData.domaciZvirata,
            description: null,
          });
          if (petsError) throw petsError;
        }

        // Update property flag
        await supabase
          .from("properties")
          .update({ form_created: true })
          .eq("id", property.id);
      } catch (dbErr: any) {
        console.warn("⚠️ Database insert failed:", dbErr.message);
      }

      // ✅ All done
      // alert("Formulář byl úspěšně odeslán.");
      setFormData(defaultFormData);
      navigate("/thank-you");
    } catch (emailError) {
      console.error("❌ Chyba při odesílání emailu:", emailError);
      alert("Došlo k chybě při odesílání formuláře.");
    }
  };

  if (loading) return <p>Načítám údaje o nemovitosti...</p>;
  if (!property) return <p>Nemovitost nenalezena.</p>;
  if (property.status !== "available") {
    return (
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div></div>
          <img
            src="/logo_pro.png"
            alt="Logo"
            style={{ height: "100px", objectFit: "contain" }}
          />
        </div>
        <h2 style={{ color: "#007BFF" }}>
          Děkujeme za Váš zájem, ale tato nemovitost již není k dispozici.
        </h2>
      </div>
    );
  }

  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div></div>
        <img
          src="/logo_pro.png"
          alt="Logo"
          style={{ height: "100px", objectFit: "contain" }}
        />
      </div>

      <h1>Pronájem nemovitosti {property.property_code}</h1>
      <p>
        <b>Adresa:</b>{" "}
        {property.property_configuration
          ? `${property.property_configuration} ${property.address}`
          : property.address}
      </p>

      <form onSubmit={handleSubmit}>
        <ApplicantSection formData={formData} handleChange={handleChange} />
        <RentalDetailsSection formData={formData} handleChange={handleChange} />

        <div className="form-group gdpr-line">
          <input
            type="checkbox"
            id="gdprConsent"
            name="gdprConsent"
            checked={formData.gdprConsent}
            onChange={handleChange}
            required
          />
          <label htmlFor="gdprConsent">
            Souhlasím se zpracováním osobních údajů v souladu s GDPR.
            <span className="required-star">*</span>
          </label>
        </div>

        <div className="form-group">
          <button type="submit">Odeslat</button>
        </div>
      </form>
    </div>
  );
}
