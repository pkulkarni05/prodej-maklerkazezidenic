// File: components/FormInput.tsx
import React from 'react';

interface FormInputProps {
  label: string;
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  required?: boolean;
  type?: string;
  min?: string;
  as?: 'textarea';
}

export default function FormInput({
  label,
  name,
  value,
  onChange,
  required = false,
  type = 'text',
  min,
  as,
}: FormInputProps) {
  return (
    <div className="form-group">
      <label>
        {label}
        {required && <span className="required-star">*</span>}
      </label>
      {as === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          required={required}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          min={min}
        />
      )}
    </div>
  );
}
