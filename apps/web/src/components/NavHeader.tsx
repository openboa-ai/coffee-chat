"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Avatar } from "@openboa/yogurt/avatar";
import { Button } from "@openboa/yogurt/button";
import { Icon } from "@openboa/yogurt/icon";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Navbar } from "@openboa/yogurt/navbar";
import { ProjectMark } from "@openboa/yogurt/project-mark";
import { Text } from "@openboa/yogurt/text";

export type AppearanceMode = "auto" | "light" | "dark";

export interface NavHeaderProps {
  user: { handle: string; name: string } | null;
  appearance: AppearanceMode;
  onAppearanceChange: (mode: AppearanceMode) => void;
}

const APPEARANCE_ORDER: AppearanceMode[] = ["auto", "light", "dark"];

const APPEARANCE_LABELS: Record<AppearanceMode, string> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
};

export function NavHeader({
  user,
  appearance,
  onAppearanceChange,
}: NavHeaderProps) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const destinations = [
    { id: "home", label: "Home", href: "/" },
    { id: "tables", label: "Tables", href: "/sources" },
    { id: "roastery", label: "My Roastery", href: "/me" },
    { id: "brew-bar", label: "Brew Bar", href: "/connect" },
  ];

  const currentId =
    pathname === "/"
      ? "home"
      : pathname.startsWith("/sources")
        ? "tables"
        : pathname.startsWith("/me")
          ? "roastery"
          : pathname.startsWith("/connect")
            ? "brew-bar"
            : "";

  const nextAppearance = () => {
    const idx = APPEARANCE_ORDER.indexOf(appearance);
    const next = APPEARANCE_ORDER[(idx + 1) % APPEARANCE_ORDER.length]!;
    onAppearanceChange(next);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/test-auth/logout", { method: "POST" });
      await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
      window.location.href = "/";
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="app-header-bar">
      <div className="app-header-inner">
        <Navbar
          variant="sections"
          label="Coffee Chat navigation"
          identity={
            <Link href="/" className="brand-identity">
              <ProjectMark project="coffee" size={26} />
              <Text variant="body">Coffee Chat</Text>
            </Link>
          }
          destinations={destinations}
          current={currentId}
          expanded={expanded}
          onExpandedChange={setExpanded}
          action={
            <Inline gap={8} align="center">
              <Button
                emphasis="quiet"
                size="compact"
                aria-label={`Appearance: ${APPEARANCE_LABELS[appearance]}. Switch appearance`}
                onClick={nextAppearance}
              >
                <Inline gap={4} align="center">
                  <Icon
                    name={appearance === "dark" ? "moon" : "sun"}
                    label=""
                  />
                  <Text variant="meta">{APPEARANCE_LABELS[appearance]}</Text>
                </Inline>
              </Button>
              {user ? (
                <>
                  <Link href={`/@${user.handle}`} className="brand-identity">
                    <Avatar label={user.name} size="compact" />
                    <Text variant="meta">@{user.handle}</Text>
                  </Link>
                  <Button
                    emphasis="quiet"
                    size="compact"
                    pending={signingOut}
                    onClick={handleSignOut}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <Link href="/signin">Sign in</Link>
              )}
            </Inline>
          }
        />
      </div>
    </div>
  );
}
