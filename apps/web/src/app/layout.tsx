import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Yogurt } from "@openboa/yogurt";
import { getCurrentUser } from "@/lib/auth";
import { NavHeader } from "@/components/NavHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coffee Chat — Author-Confirmed Perspectives",
  description:
    "Knowledge is shared. What a person makes of it is personal. Capture confirmed perspectives for agent Work and human Talk.",
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
        <Yogurt appearance="auto" material="neutral" className="cc-shell">
          <NavHeader
            user={user ? { handle: user.handle, name: user.name } : null}
          />
          <main className="cc-container">{children}</main>
        </Yogurt>
      </body>
    </html>
  );
}
