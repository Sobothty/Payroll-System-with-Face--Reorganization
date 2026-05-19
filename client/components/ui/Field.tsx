import { PropsWithChildren } from "react";

type FieldProps = PropsWithChildren<{
  label: string;
  htmlFor?: string;
}>;

export function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <div id={htmlFor}>{children}</div>
    </label>
  );
}
