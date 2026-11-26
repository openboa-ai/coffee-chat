import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import "./layers.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coffee Chat — Same source, different Beans",
  description:
    "Knowledge is shared. What a person makes of it is personal. Roast confirmed takes, track Tasting Notes, compare Tables, and Brew them in your AI.",
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
        <AppShell user={user ? { handle: user.handle, name: user.name } : null}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
