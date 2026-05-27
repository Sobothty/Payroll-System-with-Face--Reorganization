import { Children, PropsWithChildren, ReactElement, ReactNode, cloneElement, isValidElement } from "react";

import {
  Field as ShadcnField,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

type FieldProps = PropsWithChildren<{
  label: string;
  htmlFor?: string;
  description?: string;
}>;

function getControlClassName(elementType: string) {
  if (elementType === "input") {
    return "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";
  }

  if (elementType === "select") {
    return "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";
  }

  if (elementType === "textarea") {
    return "flex min-h-28 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";
  }

  return "";
}

function enhanceChildren(node: ReactNode): ReactNode {
  if (!isValidElement(node)) {
    return node;
  }

  const element = node as ReactElement<{ children?: ReactNode; className?: string }>;
  const elementType = typeof element.type === "string" ? element.type : null;
  const nextChildren =
    element.props.children == null
      ? element.props.children
      : Children.map(element.props.children, (child) => enhanceChildren(child));

  if (!elementType) {
    return cloneElement(element, undefined, nextChildren);
  }

  const controlClassName = getControlClassName(elementType);
  if (!controlClassName) {
    return cloneElement(element, undefined, nextChildren);
  }

  return cloneElement(element, { className: cn(controlClassName, element.props.className) }, nextChildren);
}

export function Field({ label, htmlFor, description, children }: FieldProps) {
  return (
    <ShadcnField className="field">
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <FieldContent>{enhanceChildren(children)}</FieldContent>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </ShadcnField>
  );
}
