import type { ComponentProps } from "react";

import { Button as ShadcnButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = Omit<ComponentProps<typeof ShadcnButton>, "variant"> & {
  tone?: "primary" | "secondary" | "success" | "danger";
};

const toneVariantMap: Record<NonNullable<ButtonProps["tone"]>, ComponentProps<typeof ShadcnButton>["variant"]> = {
  primary: "default",
  secondary: "outline",
  success: "secondary",
  danger: "destructive",
};

export function Button({ className, tone = "primary", ...props }: ButtonProps) {
  const variant = toneVariantMap[tone];

  return (
    <ShadcnButton
      variant={variant}
      className={cn(
        "btn",
        tone === "success" && "bg-[var(--success-green)] text-[var(--text-on-success)] hover:bg-[color:color-mix(in_srgb,var(--success-green)_88%,white)]",
        className,
      )}
      {...props}
    />
  );
}
