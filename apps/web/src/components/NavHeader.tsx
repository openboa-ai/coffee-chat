"use client";

import { useState } from "react";
import { Badge, Button, Inline, Link, Text } from "@openboa/yogurt";

export interface NavHeaderProps {
  user: { handle: string; name: string } | null;
}

export function NavHeader({ user }: NavHeaderProps) {
  const [signingOut, setSigningOut] = useState(false);

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
    <header className="cc-nav">
      <div className="cc-nav-links">
        <Link href="/">
          <strong>Coffee Chat</strong>
        </Link>
        <Badge tone="neutral">Zero-AI Web</Badge>
        <Link href="/connect">Connect Agent</Link>
        <Link href="/sources">Sources</Link>
        <Link href="/me">My Roastery</Link>
      </div>

      <Inline gap={12}>
        {user ? (
          <>
            <Link href={`/@${user.handle}`}>
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
    </header>
  );
}
