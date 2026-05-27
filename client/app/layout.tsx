import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";

import AppShell from "@/components/AppShell";
import { THEME_STORAGE_KEY } from "@/lib/theme";

import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "PulseLedger",
  description: "Payroll management with face recognition attendance.",
};

const themeBootScript = `
  (() => {
    try {
      const key = ${JSON.stringify(THEME_STORAGE_KEY)};
      const storedTheme = window.localStorage.getItem(key);
      const systemTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      const theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
    }
  })();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body>
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
