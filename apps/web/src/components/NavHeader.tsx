"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@openboa/yogurt/avatar";
import { Button } from "@openboa/yogurt/button";
import { Icon } from "@openboa/yogurt/icon";
import { Inline } from "@openboa/yogurt/inline";
import { Link } from "@openboa/yogurt/link";
import { Navbar } from "@openboa/yogurt/navbar";
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

function CoffeeChatMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="3"
          y="6"
          width="11"
          height="9"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M14 8.25H15.5C16.6 8.25 17.5 9.15 17.5 10.25C17.5 11.35 16.6 12.25 15.5 12.25H14"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M6.5 3.25C6.5 2.4 7.4 2.4 7.4 3.75M10 3.25C10 2.4 10.9 2.4 10.9 3.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function NavHeader({
  user,
  appearance,
  onAppearanceChange,
}: NavHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const destinations = [
    { id: "explore", label: "Explore", href: "/" },
    { id: "tables", label: "Tables", href: "/sources" },
    { id: "roastery", label: "My Roastery", href: "/me" },
    { id: "brew-setup", label: "Brew Setup", href: "/connect" },
  ];

  const currentId =
    pathname === "/"
      ? "explore"
      : pathname.startsWith("/sources")
        ? "tables"
        : pathname.startsWith("/me")
          ? "roastery"
          : pathname.startsWith("/connect")
            ? "brew-setup"
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

  const handleRoastClick = () => {
    const target = user
      ? "/me?compose=1"
      : "/signin?returnTo=%2Fme%3Fcompose%3D1";
    router.push(target);
  };

  return (
    <header className="app-header-bar">
      <div className="app-header-inner">
        <Navbar
          variant="sections"
          label="Coffee Chat navigation"
          identity={
            <Link href="/" className="brand-identity">
              <CoffeeChatMark />
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
                emphasis="filled"
                tone="brand"
                size="compact"
                onClick={handleRoastClick}
              >
                Roast a Bean
              </Button>
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
    </header>
  );
}
