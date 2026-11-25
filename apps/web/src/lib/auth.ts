import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  accounts,
  CoffeeChatError,
  sessions,
  users,
  verifications,
  type CoffeeChatDb,
} from "@coffee-chat/core";
import { getAppOrigin, getDb } from "./runtime";

export const TEST_SESSION_COOKIE = "cc_test_session";

export function isTestAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.COFFEE_CHAT_ENABLE_TEST_AUTH === "true"
  );
}

/**
 * Validates same-origin relative returnTo paths to prevent open redirects.
 */
export function sanitizeReturnTo(raw?: string | null): string {
  if (!raw) return "/me";
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) {
    return raw;
  }
  return "/me";
}

export interface SessionUser {
  id: string;
  handle: string;
  name: string;
  email: string;
}

export async function createBetterAuthInstance(db: CoffeeChatDb) {
  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  return betterAuth({
    baseURL: getAppOrigin(),
    secret:
      process.env.BETTER_AUTH_SECRET ||
      "coffee-chat-local-dev-secret-change-in-production",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    account: {
      accountLinking: {
        // Spec invariant: implicit OAuth sign-in auto-merge stays OFF via disableImplicitLinking,
        // while authenticated users can explicitly link GitHub/Google via /api/auth/link-social.
        enabled: true,
        disableImplicitLinking: true,
        trustedProviders: ["github", "google"],
        allowDifferentEmails: true,
      },
    },
    user: {
      additionalFields: {
        handle: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const base = (user.name || user.email?.split("@")[0] || "user")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 20) || "user";
            const suffix = Math.random().toString(36).slice(2, 6);
            return {
              data: {
                ...user,
                handle: `${base}-${suffix}`,
              },
            };
          },
        },
      },
    },
    socialProviders,
  });
}

function parseCookieHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export async function getCurrentUser(
  request?: Request,
): Promise<SessionUser | null> {
  const db = await getDb();

  // 1. Check test-only local session cookie ONLY when explicitly enabled outside production.
  if (isTestAuthEnabled()) {
    let testUserId: string | null = null;
    if (request) {
      testUserId = parseCookieHeader(
        request.headers.get("cookie"),
        TEST_SESSION_COOKIE,
      );
    } else {
      try {
        const cookieStore = await cookies();
        testUserId = cookieStore.get(TEST_SESSION_COOKIE)?.value ?? null;
      } catch {
        testUserId = null;
      }
    }

    if (testUserId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);
      if (user) {
        return {
          id: user.id,
          handle: user.handle,
          name: user.name,
          email: user.email,
        };
      }
    }
  }

  // 2. Check Better Auth session token.
  try {
    const auth = await createBetterAuthInstance(db);
    let headersObj: Headers;
    if (request) {
      headersObj = request.headers;
    } else {
      const cookieStore = await cookies();
      headersObj = new Headers({
        cookie: cookieStore
          .getAll()
          .map((c) => `${c.name}=${c.value}`)
          .join("; "),
      });
    }
    const session = await auth.api.getSession({ headers: headersObj });
    if (session?.user?.id) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      if (user) {
        return {
          id: user.id,
          handle: user.handle,
          name: user.name,
          email: user.email,
        };
      }
    }
  } catch {
    // Unauthenticated
  }

  return null;
}

export async function requireCurrentUser(
  request?: Request,
): Promise<SessionUser> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new CoffeeChatError(
      "UNAUTHORIZED",
      401,
      "Please sign in to perform this action.",
    );
  }
  return user;
}
