"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoonStar, LogOut, SunMedium } from "lucide-react";

import { clearSession } from "@/lib/auth";
import { getAppRole } from "@/lib/navigation";
import { getPreferredTheme, persistTheme } from "@/lib/theme";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function NavUser({ username, role }: { username: string; role: string }) {
  const router = useRouter();
  const appRole = getAppRole(role);
  const [theme, setTheme] = useState(getPreferredTheme);

  return (
    <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/45 p-3">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback>{getInitials(username || "PL")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{username || "PulseLedger"}</div>
          <div className="truncate text-xs text-sidebar-foreground/70 capitalize">{appRole}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <Button
          variant="outline"
          className="justify-start border-sidebar-border/70 bg-transparent"
          onClick={() => {
            const nextTheme = theme === "dark" ? "light" : "dark";
            persistTheme(nextTheme);
            setTheme(nextTheme);
          }}
        >
          {theme === "dark" ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </Button>
        <Button
          variant="ghost"
          className="justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => {
            clearSession();
            router.push("/login");
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
