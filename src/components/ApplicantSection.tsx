// File: components/ApplicantSection.tsx
import React from 'react';
import { type FormDataType } from '../types/form';
import FormInput from './FormInput';

interface Props {
  formData: FormDataType;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
}

export default function ApplicantSection({ formData, handleChange }: Props) {
  return (
    <fieldset>
      <legend>ZÁJEMCE</legend>

      <div className="form-group">
        <FormInput
          label="Jméno a příjmení"
          name="jmeno"
          value={formData.jmeno}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <FormInput
          label="Trvalý pobyt dle OP"
          name="trvalyPobyt"
          value={formData.trvalyPobyt}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <FormInput
          label="Skutečné bydliště"
          name="skutecneBydliste"
          value={formData.skutecneBydliste}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <FormInput
          label="Telefon"
          name="telefon"
          value={formData.telefon}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <FormInput
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Záznam v rejstříku trestů:<span className="required-star">*</span></label>
        <select
          name="trestniRejstrik"
          value={formData.trestniRejstrik}
          onChange={handleChange}
          required
        >
          <option value="">-- Vyberte --</option>
          <option value="Ano">Ano</option>
          <option value="Ne">Ne</option>
        </select>
      </div>

      <div className="form-group">
        <label>Záznam v insolvenčním rejstříku:<span className="required-star">*</span></label>
        <select
          name="insolvence"
          value={formData.insolvence}
          onChange={handleChange}
          required
        >
          <option value="">-- Vyberte --</option>
          <option value="Ano">Ano</option>
          <option value="Ne">Ne</option>
        </select>
      </div>

      <div className="form-group">
        <label>Záznam v rejstříku exekucí:<span className="required-star">*</span></label>
        <select
          name="exekuce"
          value={formData.exekuce}
          onChange={handleChange}
          required
        >
          <option value="">-- Vyberte --</option>
          <option value="Ano">Ano</option>
          <option value="Ne">Ne</option>
        </select>
      </div>

      
    </fieldset>
  );
}
