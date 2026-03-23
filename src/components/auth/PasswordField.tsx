"use client";

import { useState } from "react";

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

export default function PasswordField({
  value,
  onChange,
  placeholder = "Senha",
  required = true,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        required={required}
        placeholder={placeholder}
        value={value}
        className="w-full rounded-lg border p-3 pr-12 outline-blue-500"
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShowPassword((v) => !v)}
        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
      >
        {showPassword ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l2.13 2.13C3.08 7 1.8 8.87 1.2 10.03a2.2 2.2 0 0 0 0 1.94C2.35 14.2 5.85 19.5 12 19.5c2.08 0 3.88-.61 5.41-1.52l3.06 3.05a.75.75 0 1 0 1.06-1.06l-18-18ZM12 9a3 3 0 0 1 2.94 3.62l-3.56-3.56A3 3 0 0 1 12 9Zm-3 3c0-.3.04-.6.12-.87l3.75 3.75A3 3 0 0 1 9 12Zm3 6c-5.02 0-8.03-4.63-9.03-6.57a.7.7 0 0 1 0-.62c.49-.95 1.45-2.49 2.94-3.77l1.5 1.5A4.47 4.47 0 0 0 7.5 12a4.5 4.5 0 0 0 6.96 3.76l1.83 1.82A8.46 8.46 0 0 1 12 18Z" />
            <path d="M10.99 5.04A8.45 8.45 0 0 1 12 4.5c6.15 0 9.65 5.3 10.8 7.53.22.43.22.95 0 1.38-.35.68-.91 1.65-1.68 2.7a.75.75 0 1 1-1.2-.9c.7-.93 1.2-1.8 1.55-2.47a.7.7 0 0 0 0-.62C20.47 10.18 17.46 5.55 12.44 5.55a6.9 6.9 0 0 0-.73.04.75.75 0 1 1-.72-.55Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 4.5c6.15 0 9.65 5.3 10.8 7.53.22.43.22.95 0 1.38-1.15 2.23-4.65 7.53-10.8 7.53S2.35 15.64 1.2 13.41a2.2 2.2 0 0 1 0-1.38C2.35 9.8 5.85 4.5 12 4.5Zm0 13.5c5.02 0 8.03-4.63 9.03-6.57a.7.7 0 0 0 0-.62C20.03 8.87 17.02 4.24 12 4.24S3.97 8.87 2.97 10.81a.7.7 0 0 0 0 .62C3.97 13.37 6.98 18 12 18Zm0-10.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 1.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
