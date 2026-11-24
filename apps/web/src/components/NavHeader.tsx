"use client";

import { useState } from "react";
import {
  AgentAvatar,
  Avatar,
  Button,
  Inline,
  Link,
  Text,
} from "@openboa/yogurt";

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
    <div className="cc-nav-wrap">
      <header className="cc-nav">
        <div className="cc-nav-links">
          <Link href="/" className="cc-brand-link">
            <AgentAvatar
              agent="bean-top"
              state="ready"
              animated={false}
              size={24}
              label="Coffee Chat"
            />
            <span>Coffee Chat</span>
          </Link>
          <Link href="/sources">Tables</Link>
          <Link href="/me">My Table</Link>
          <Link href="/connect">Use with AI</Link>
        </div>

        <Inline gap={12}>
          <Link href={user ? "/me?compose=1" : "/signin?returnTo=/me?compose=1"}>
            <Button emphasis="filled" tone="brand" size="compact">
              Share a take
            </Button>
          </Link>
          {user ? (
            <>
              <Link href={`/@${user.handle}`} className="cc-brand-link">
                <Avatar label={user.name} size={24} />
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
    </div>
  );
}
