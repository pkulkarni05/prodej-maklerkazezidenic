// File: src/pages/PropertySalesForm.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import ApplicantSection from "../components/ApplicantSection";
import SalesDetailsSection from "../components/SalesDetailsSection";
import "../App.css";
import emailjs from "@emailjs/browser";

export default function PropertySalesForm() {
  const { propertyCode } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({});
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch property by code
  useEffect(() => {
    async function fetchProperty() {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("property_code", propertyCode)
        .single();

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
    const { name, type, value, checked } = e.target as HTMLInputElement;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
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

    try {
      // 1️⃣ Send email
      await emailjs.send(
        "service_p3fe37b",
        "template_jkdzxv4", // later you might use a dedicated sales template
        {
          ...formData,
          property_code: property.property_code,
          full_address: `${property.property_configuration} ${property.address}`,
        },
        "I3PK3ZMDK5KDBbG79"
      );

      // 2️⃣ Insert applicant
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

      // 3️⃣ Insert sales inquiry
      const { error: inquiryError } = await supabase
        .from("sales_inquiries")
        .insert({
          applicant_id: applicantId,
          property_id: property.id,
          message: formData.zprava || null, // placeholder field from SalesDetailsSection
          received_at: new Date().toISOString(),
        });

      if (inquiryError) throw inquiryError;

      // 4️⃣ Update property flag
      await supabase
        .from("properties")
        .update({ form_created: true })
        .eq("id", property.id);

      // Reset + navigate
      setFormData({});
      navigate("/thank-you");
    } catch (err: any) {
      console.error("❌ Error submitting sales form:", err.message);
      alert("Došlo k chybě při odesílání formuláře.");
    }
  };

  if (loading) return <p>Načítám údaje o nemovitosti...</p>;
  if (!property) return <p>Nemovitost nenalezena.</p>;
  if (property.status !== "available") {
    return (
      <div className="container">
        <h2 style={{ color: "#007BFF" }}>
          Děkujeme za Váš zájem, ale tato nemovitost již není k dispozici.
        </h2>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Prodej nemovitosti {property.property_code}</h1>
      <p>
        <b>Adresa:</b>{" "}
        {property.property_configuration
          ? `${property.property_configuration} ${property.address}`
          : property.address}
      </p>

      <form onSubmit={handleSubmit}>
        {/* ✅ Applicant fields reused */}
        <ApplicantSection formData={formData} handleChange={handleChange} />

        {/* ✅ Sales details placeholder section */}
        <SalesDetailsSection formData={formData} handleChange={handleChange} />

        {/* ✅ GDPR */}
        <div className="form-group gdpr-line">
          <input
            type="checkbox"
            id="gdprConsent"
            name="gdprConsent"
            checked={formData.gdprConsent || false}
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
