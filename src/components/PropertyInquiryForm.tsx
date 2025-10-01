// File: components/PropertyInquiryForm.tsx
import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { supabase } from '../supabaseClient';
import { type FormDataType, defaultFormData } from '../types/form';
import ApplicantSection from './ApplicantSection';
import RentalDetailsSection from './RentalDetailsSection';
import '../App.css';

interface PropertyInquiryFormProps {
  propertyId: string;
  propertyName: string;
}

export default function PropertyInquiryForm({ propertyId, propertyName }: PropertyInquiryFormProps) {
  const [formData, setFormData] = useState<FormDataType>(defaultFormData);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, type, value } = e.target;
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: target.checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.jmeno || !/^[A-Za-zÀ-ž\s\-']{2,}$/.test(formData.jmeno)) {
      alert('Zadejte platné jméno.');
      return;
    }
    if (!formData.telefon || !/^\+?[0-9\s\-]{6,20}$/.test(formData.telefon)) {
      alert('Zadejte platné telefonní číslo.');
      return;
    }
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      alert('Zadejte platný email.');
      return;
    }
    if (!formData.gdprConsent) {
      alert('Musíte souhlasit se zpracováním osobních údajů.');
      return;
    }

    if (formData.dalsiUzivatele === 'Ano') {
      const count = parseInt(formData.dalsiUzivatelePocet || '0', 10);
      const details = [];
      for (let i = 0; i < count; i++) {
        details.push(
          `Osoba ${i + 1}: Věk: ${formData[`vek_${i}`] || ''}, Zaměstnání: ${formData[`zamestnani_${i}`] || ''}`
        );
      }
      formData.dalsiUzivateleDetaily = details.join('\n');
    }

    const { data: applicantData, error: applicantError } = await supabase
      .from('applicants')
      .insert({
        full_name: formData.jmeno,
        permanent_address: formData.trvalyPobyt,
        actual_address: formData.skutecneBydliste,
        phone: formData.telefon,
        email: formData.email,
        has_criminal_record: formData.trestniRejstrik === 'Ano',
        is_in_insolvency: formData.insolvence === 'Ano',
        is_under_exekuce: formData.exekuce === 'Ano',
        agreed_to_gdpr: formData.gdprConsent,
      })
      .select()
      .single();

    if (applicantError) {
      alert('Chyba při ukládání údajů žadatele.');
      return;
    }

    const applicantId = applicantData.id;
    const { data: inquiryData, error: inquiryError } = await supabase
      .from('rental_inquiries')
      .insert({
        client_id: applicantId,
        property_id: propertyId,
        move_in_date: formData.terminNastehovani,
        desired_rental_duration: formData.pozadovanaDelka,
        has_pets: formData.domaciZvirata !== 'Bez zvířat',
        is_smoker: formData.kurak === 'Ano',
        deposit_agreed: formData.kauce === 'Ano',
        other_users: formData.dalsiUzivatele,
        other_users_count: parseInt(formData.dalsiUzivatelePocet || '0', 10),
        other_users_details: formData.dalsiUzivateleDetaily || null,
        previous_landlord_contact: formData.kontaktNaMajitele || null,
        last_rent_duration: formData.delkaPronajmu || null,
        special_requests: formData.pozadavky || null,
        about_you: formData.oVas || null,
        submitted_at: formData.datum || new Date().toISOString(),
      })
      .select()
      .single();

    if (inquiryError) {
      alert('Chyba při ukládání poptávky.');
      return;
    }

    const inquiryId = inquiryData.id;
    if (formData.domaciZvirata && formData.domaciZvirata !== 'Bez zvířat') {
  await supabase.from('pets').insert({
    inquiry_id: inquiryId,
    type: formData.domaciZvirata,
  });
}

    if (formData.dalsiUzivatele === 'Ano') {
      const count = parseInt(formData.dalsiUzivatelePocet || '0', 10);
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
        await supabase.from('co_applicants').insert(coApplicants);
      }
    }

     emailjs
      .send('service_p3fe37b', 'template_jkdzxv4', formData, 'I3PK3ZMDK5KDBbG79')
      .then(() => {
        alert('Formulář byl úspěšně odeslán.');
        setFormData(defaultFormData);
      })
      .catch(() => alert('Došlo k chybě při odesílání formuláře.')); 
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div></div>
        <img src="/logo_pro.png" alt="Logo" style={{ height: '100px', objectFit: 'contain' }} />
      </div>

      <h1 className="form-header">
        Pronájem nemovitosti<br />{propertyName}
      </h1>
      <p className="form-intro">
        Tento dotazník by měl poskytnout dostatek relevantních informací majiteli nemovitosti o Vás i případných spolubydlících.
        Veškeré údaje v něm poskytnuté považujeme za důvěrné. Děkujeme za čas, který vyplnění formuláře věnujete a těšíme se na spolupráci s Vámi.
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
            Souhlasím se zpracováním osobních údajů uvedených ve formuláři za účelem
            zprostředkování nájmu nemovitosti v souladu s GDPR.<span className="required-star">*</span>
          </label>
        </div>

        <div className="form-group">
          <button type="submit">Odeslat</button>
        </div>
      </form>
    </div>
  );
}
