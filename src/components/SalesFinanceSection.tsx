// src/components/SalesFinanceSection.tsx
// Purpose: Presentational component. Receives property/applicant context as props.

import React from "react";
import FormInput from "./FormInput";
import {
  type SalesFinanceFormData,
  type FinancingMethod,
  type MortgageAdvisorChoice,
  type MortgageProgress,
  type TiedToSale,
} from "../types/salesForm";

interface Props {
  formData: SalesFinanceFormData;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  /** Human-readable address, e.g., "3+1 Klíny 12, Brno" or "Klíny 12, Brno" */
  propertyAddress?: string;
  /** Optional preformatted viewing time text, e.g., "úterý 21. 10. 2025 v 17:30" */
  viewingTimeText?: string;
}

export default function SalesFinanceSection({
  formData,
  handleChange,
  propertyAddress,
  viewingTimeText,
}: Props) {
  return (
    <fieldset>
      <h2>KRÁTKÝ DOTAZNÍK K FINANCOVÁNÍ</h2>

      {/* Intro paragraph uses dynamic address and (optionally) booked viewing time */}
      <div className="form-group">
        <p style={{ marginTop: 0 }}>
          Dobrý den,
          <br />
          {/* If we know the slot, mention it; otherwise keep the generic thank-you */}
          {viewingTimeText ? (
            <>
              děkuji Vám za rezervaci termínu prohlídky{" "}
              {propertyAddress ? (
                <>bytu na adrese {propertyAddress}</>
              ) : (
                <>tohoto bytu</>
              )}{" "}
              na {viewingTimeText}.{" "}
            </>
          ) : (
            <>
              děkuji Vám za rezervaci termínu prohlídky{" "}
              {propertyAddress ? (
                <>bytu na adrese {propertyAddress}</>
              ) : (
                <>tohoto bytu</>
              )}
              .{" "}
            </>
          )}
          Abych mohla celý proces přizpůsobit Vaší situaci a zajistit plynulý
          průběh, dovolím si Vás požádat o vyplnění krátkého dotazníku. Nezabere
          Vám více než 1–2 minuty.
          <br />
          Děkuji předem za spolupráci!
        </p>
      </div>

      {/* Identification */}
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

      {/* Q1 */}
      <div className="form-group">
        <label>
          1. Jak plánujete financovat koupi nemovitosti?
          <span className="required-star">*</span>
        </label>
        <select
          name="financovani"
          value={formData.financovani}
          onChange={handleChange}
          required
        >
          <option value="">-- Vyberte --</option>
          {[
            "Vlastními zdroji",
            "Hypotékou",
            "Kombinací hypotéky a vlastních zdrojů",
          ].map((opt) => (
            <option key={opt} value={opt as FinancingMethod}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Q2 */}
      <div className="form-group">
        <label>
          2. Pokud uvažujete o hypotéce, jaký je přibližný poměr financování?
          <br></br>
          <small>
            (Pokud neplánujete využít hypotéku, tuto otázku přeskočte.)
          </small>
        </label>
        <div
          style={{
            display: "grid",
            gap: "8px",
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div>
            <label htmlFor="vlastniProcent">💰 Vlastní zdroje (%)</label>
            <input
              id="vlastniProcent"
              type="number"
              min={0}
              max={100}
              step={1}
              name="vlastniProcent"
              value={formData.vlastniProcent}
              onChange={handleChange}
              placeholder="např. 20"
            />
          </div>
          <div>
            <label htmlFor="hypotekyProcent">🏦 Hypotéka (%)</label>
            <input
              id="hypotekyProcent"
              type="number"
              min={0}
              max={100}
              step={1}
              name="hypotekyProcent"
              value={formData.hypotekyProcent}
              onChange={handleChange}
              placeholder="např. 80"
            />
          </div>
        </div>
      </div>

      {/* Q3 */}
      <div className="form-group">
        <label>
          3. Máte už k hypotéce svého finančního poradce?
          <span className="required-star">*</span>
        </label>
        <select
          name="financniPoradce"
          value={formData.financniPoradce}
          onChange={handleChange}
          required
        >
          <option value="">-- Vyberte --</option>
          {[
            "Ano",
            "Ne",
            "Ne, uvítal/a bych doporučení na spolehlivého specialistu",
          ].map((opt) => (
            <option key={opt} value={opt as MortgageAdvisorChoice}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Q4 */}
      <div className="form-group">
        <label>
          4. Jak daleko jste s vyřizováním hypotéky?
          <span className="required-star">*</span>
        </label>
        <select
          name="stavHypoteky"
          value={formData.stavHypoteky}
          onChange={handleChange}
          required
        >
          <option value="">-- Vyberte --</option>
          {[
            "Teprve budu začínat",
            "Zatím zjišťuji možnosti a podmínky",
            "Mám již rozjednanou hypotéku / konzultaci v bance",
            "Hypotéku mám již schválenou",
          ].map((opt) => (
            <option key={opt} value={opt as MortgageProgress}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Q5 */}
      <div className="form-group">
        <label>
          5. Je Vaše koupě vázaná na prodej jiné nemovitosti?
          <span className="required-star">*</span>
        </label>
        <select
          name="vazanoNaProdej"
          value={formData.vazanoNaProdej}
          onChange={handleChange}
          required
        >
          <option value="">-- Vyberte --</option>
          {["Ano", "Ne"].map((opt) => (
            <option key={opt} value={opt as TiedToSale}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Q6 */}
      <div className="form-group">
        <label htmlFor="poznamka">
          6. Máte k financování nebo nemovitosti nějakou otázku či poznámku, o
          které bych měla vědět před prohlídkou? <small>(Volitelné)</small>
        </label>
        <textarea
          id="poznamka"
          name="poznamka"
          value={formData.poznamka}
          onChange={handleChange}
          rows={4}
          placeholder="Vaše poznámka…"
        />
      </div>

      {/* Outro */}
      <div className="form-group">
        <p>
          🔒 Vaše odpovědi jsou důvěrné a pomohou mi přizpůsobit celý proces
          tak, aby pro Vás byl co nejpříjemnější a nejefektivnější.
          <br />
          Děkuji Vám za spolupráci a těším se na osobní setkání!
          <br />
          <strong>Jana Bodáková</strong>
        </p>
      </div>
    </fieldset>
  );
}
