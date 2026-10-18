import type { InputHTMLAttributes, ReactNode } from "react";

// A labelled text field with an optional hint and an error that replaces the hint. Used by every
// form in the customer app.
export default function TextField({
  label,
  hint,
  error,
  className,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & { label: ReactNode; hint?: ReactNode; error?: ReactNode; className?: string }) {
  return (
    <label className="fd-field">
      {label}
      <input aria-invalid={Boolean(error)} className={`fd-input ${className ?? ""}`} {...input} />
      {error ? (
        <span className="fd-field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <small>{hint}</small>
      ) : null}
    </label>
  );
}
