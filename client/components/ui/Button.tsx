import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "success" | "danger";
};

export function Button({ className = "", tone = "primary", ...props }: ButtonProps) {
  return <button className={`btn btn-${tone} ${className}`.trim()} {...props} />;
}
