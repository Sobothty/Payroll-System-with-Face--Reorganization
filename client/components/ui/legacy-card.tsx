import type { ComponentProps } from "react";

import {
  Card as ShadcnCard,
  CardAction,
  CardContent as ShadcnCardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CardProps = ComponentProps<typeof ShadcnCard>;

export function Card({ children, className, ...props }: CardProps) {
  return (
    <ShadcnCard
      className={cn("surface-card border-border/70 bg-card/95 text-card-foreground shadow-sm", className)}
      {...props}
    >
      <ShadcnCardContent className="px-5 sm:px-6">{children}</ShadcnCardContent>
    </ShadcnCard>
  );
}

export { CardAction, CardDescription, CardFooter, CardHeader, CardTitle };
export const CardContent = ShadcnCardContent;
