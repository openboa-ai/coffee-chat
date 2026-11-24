import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Yogurt } from "@openboa/yogurt";
import { getCurrentUser } from "@/lib/auth";
import { NavHeader } from "@/components/NavHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coffee Chat — Same article, different takes",
  description:
    "Knowledge is shared. What a person makes of it is personal. Capture the trade-offs that matter to you and bring them into your AI work and conversations.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <Yogurt appearance="auto" material="paper" className="cc-shell">
          <NavHeader
            user={user ? { handle: user.handle, name: user.name } : null}
          />
          <main className="cc-container">{children}</main>
        </Yogurt>
      </body>
    </html>
  );
}
