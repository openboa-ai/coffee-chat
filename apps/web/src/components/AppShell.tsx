"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@openboa/yogurt/link";
import { Text } from "@openboa/yogurt/text";
import { Yogurt } from "@openboa/yogurt/yogurt";
import { NavHeader, type AppearanceMode } from "./NavHeader";

const APPEARANCE_KEY = "coffee-chat-appearance";

export interface AppShellProps {
  user: { handle: string; name: string } | null;
  children: ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [appearance, setAppearance] = useState<AppearanceMode>("auto");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(APPEARANCE_KEY);
      if (saved === "auto" || saved === "light" || saved === "dark") {
        setAppearance(saved);
      }
    } catch {
      // Ignore storage access failures in private/restricted browsers.
    }
  }, []);

  const handleAppearanceChange = (next: AppearanceMode) => {
    setAppearance(next);
    try {
      window.localStorage.setItem(APPEARANCE_KEY, next);
    } catch {
      // Ignore storage write failures.
    }
  };

  const isHome = pathname === "/";
  const isWideWorkspace = pathname === "/me" || pathname.startsWith("/me/");

  return (
    <Yogurt
      appearance={appearance}
      material="neutral"
      className={isHome ? "app-shell app-shell-home" : "app-shell"}
    >
      <NavHeader
        user={user}
        appearance={appearance}
        onAppearanceChange={handleAppearanceChange}
      />
      <main
        className={
          isHome
            ? "app-main-home"
            : isWideWorkspace
              ? "app-main-wide"
              : "app-main"
        }
      >
        {children}
      </main>
      <footer
        className={isHome ? "app-footer app-footer-home" : "app-footer"}
        aria-label="Coffee Chat footer"
      >
        <Text variant="meta">Coffee Chat · Personal Taste for your Agents</Text>
        <nav className="app-footer-links" aria-label="Footer navigation">
          <Link href="/sources">Tables</Link>
          <Link href="/me">My Roastery</Link>
          <Link href="/connect">Brew Bar</Link>
        </nav>
      </footer>
    </Yogurt>
  );
}
