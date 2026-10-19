import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={`field ${className ?? ''}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="required-mark">필수</span> : null}
      </label>
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
