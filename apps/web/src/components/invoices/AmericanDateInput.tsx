"use client";
import { useEffect, useRef, useState, InputHTMLAttributes } from "react";

export function parseAmericanDate(text: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return "";
  const [, month, day, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number(year) >= 1000 &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === iso
    ? iso
    : "";
}
const display = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`
    : "";
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & { value: string; onChange: (value: string) => void };
export default function AmericanDateInput({
  value,
  onChange,
  min,
  max,
  ...props
}: Props) {
  const [draft, setDraft] = useState(display(value));
  const emitted = useRef(value);
  useEffect(() => {
    if (value !== emitted.current) {
      setDraft(display(value));
      emitted.current = value;
    }
  }, [value]);
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder="MM/DD/YYYY"
      maxLength={10}
      value={draft}
      onChange={(event) => {
        const raw = event.target.value;
        const iso = parseAmericanDate(raw);
        const valid =
          !!iso && (!min || iso >= String(min)) && (!max || iso <= String(max));
        event.target.setCustomValidity(
          raw && !valid
            ? "Enter a valid date in MM/DD/YYYY format within the allowed range."
            : "",
        );
        setDraft(raw);
        emitted.current = valid ? iso : "";
        onChange(emitted.current);
      }}
    />
  );
}
