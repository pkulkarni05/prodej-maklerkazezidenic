// File: src/components/SalesDetailsSection.tsx

import React from "react";

interface SalesDetailsSectionProps {
  formData: any;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
}

export default function SalesDetailsSection({
  formData,
  handleChange,
}: SalesDetailsSectionProps) {
  return (
    <div className="form-section">
      <h3>Detaily k poptávce</h3>

      <div className="form-group">
        <label htmlFor="zprava">Vaše zpráva pro makléře</label>
        <textarea
          id="zprava"
          name="zprava"
          value={formData.zprava || ""}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
