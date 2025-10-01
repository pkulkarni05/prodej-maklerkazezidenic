// File: components/RentalDetailsSection.tsx
import FormInput from './FormInput';

interface RentalDetailsSectionProps {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export default function RentalDetailsSection({ formData, handleChange }: RentalDetailsSectionProps) {
  const coApplicantsCount = parseInt(formData.dalsiUzivatelePocet || '0', 10);

  return (
    <fieldset>
      <legend>PRONÁJEM</legend>

      <FormInput
        label="Předpokládaný termín nastěhování"
        name="terminNastehovani"
        type="date"
        min={new Date().toISOString().split('T')[0]}
        value={formData.terminNastehovani}
        onChange={handleChange}
        required
      />

      <FormInput
        label="Požadovaná délka pronájmu"
        name="pozadovanaDelka"
        value={formData.pozadovanaDelka}
        onChange={handleChange}
        required
      />

      <div className="form-group">
        <label>Další uživatelé bytu?<span className="required-star">*</span></label>
        <select name="dalsiUzivatele" value={formData.dalsiUzivatele} onChange={handleChange} required>
          <option value="">-- Vyberte --</option>
          <option value="Ano">Ano</option>
          <option value="Ne">Ne</option>
        </select>
      </div>

      {formData.dalsiUzivatele === 'Ano' && (
        <>
          <FormInput
            label="Počet dalších uživatelů"
            name="dalsiUzivatelePocet"
            type="number"
            value={formData.dalsiUzivatelePocet}
            onChange={handleChange}
            required
          />
          {[...Array(coApplicantsCount).keys()].map(i => (
            <div key={i} className="form-group">
              <label>Osoba {i + 1} - Věk:<span className="required-star">*</span></label>
              <input name={`vek_${i}`} value={formData[`vek_${i}`] || ''} onChange={handleChange} required />
              <label>Zaměstnání:</label>
              <input name={`zamestnani_${i}`} value={formData[`zamestnani_${i}`] || ''} onChange={handleChange} />
            </div>
          ))}
        </>
      )}

      <div className="form-group">
        <label>Domácí zvířata?<span className="required-star">*</span></label>
        <select name="domaciZvirata" value={formData.domaciZvirata} onChange={handleChange} required>
          <option value="">-- Vyberte --</option>
          <option value="Bez zvířat">Bez zvířat</option>
          <option value="Pes">Pes</option>
          <option value="Kočka">Kočka</option>
          <option value="Klecová">Klecová zvířata</option>
          <option value="Jiná">Jiná zvířata</option>
          <option value="Více">Více než 1 zvíře</option>
        </select>
      </div>

      <div className="form-group">
        <label>Kuřák?<span className="required-star">*</span></label>
        <select name="kurak" value={formData.kurak} onChange={handleChange} required>
          <option value="">-- Vyberte --</option>
          <option value="Ano">Ano</option>
          <option value="Ne">Ne</option>
        </select>
      </div>

      <FormInput
        label="Speciální požadavky na zařízení bytu"
        name="pozadavky"
        as="textarea"
        value={formData.pozadavky}
        onChange={handleChange}
      />

      <FormInput
        label="Něco málo o vás (práce, zájmy, koníčky)"
        name="oVas"
        as="textarea"
        value={formData.oVas}
        onChange={handleChange}
      />

      <div className="form-group">
        <label>Souhlasíte s kaucí uvedenou v inzerátu?<span className="required-star">*</span></label>
        <select name="kauce" value={formData.kauce} onChange={handleChange} required>
          <option value="">-- Vyberte --</option>
          <option value="Ano">Ano</option>
          <option value="Ne">Ne</option>
        </select>
      </div>

      <FormInput
        label="Datum"
        name="datum"
        type="date"
        value={formData.datum}
        onChange={handleChange}
        required
      />
    </fieldset>
  );
}
