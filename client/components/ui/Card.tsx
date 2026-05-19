import { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren) {
  return <section className="surface-card">{children}</section>;
}
