import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { CoffeeChatDb } from "../db/client.js";
import { accounts, oauthGrants, users } from "../db/schema.js";
import { CoffeeChatError } from "../types.js";

export interface UserSummary {
  id: string;
  handle: string;
  name: string;
  email: string;
}

export interface LinkedAccountView {
  id: string;
  providerId: string;
  accountId: string;
  createdAt: string;
}

export async function ensureUser(
  db: CoffeeChatDb,
  input: {
    id?: string;
    handle: string;
    name: string;
    email: string;
    providerId?: string;
    providerAccountId?: string;
  },
): Promise<UserSummary> {
  const cleanHandle = input.handle.trim().toLowerCase();
  const cleanEmail = input.email.trim().toLowerCase();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.handle, cleanHandle))
    .limit(1);

  if (existing[0]) {
    return {
      id: existing[0].id,
      handle: existing[0].handle,
      name: existing[0].name,
      email: existing[0].email,
    };
  }

  const userId = input.id ?? randomUUID();
  await db.insert(users).values({
    id: userId,
    handle: cleanHandle,
    name: input.name.trim(),
    email: cleanEmail,
    emailVerified: true,
  });

  if (input.providerId && input.providerAccountId) {
    await db.insert(accounts).values({
      id: randomUUID(),
      userId,
      providerId: input.providerId,
      accountId: input.providerAccountId,
    });
  }

  return {
    id: userId,
    handle: cleanHandle,
    name: input.name.trim(),
    email: cleanEmail,
  };
}

export async function listLinkedAccounts(
  db: CoffeeChatDb,
  userId: string,
): Promise<LinkedAccountView[]> {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  return rows.map((row) => ({
    id: row.id,
    providerId: row.providerId,
    accountId: row.accountId,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Explicit provider account linking.
 * Rejects any identity already belonging to another Coffee Chat account.
 * Never overwrites the existing public profile (handle/name).
 */
export async function linkProviderAccount(
  db: CoffeeChatDb,
  userId: string,
  providerId: "github" | "google" | "local-test",
  providerAccountId: string,
): Promise<LinkedAccountView> {
  const existing = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.providerId, providerId),
        eq(accounts.accountId, providerAccountId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    if (existing[0].userId !== userId) {
      throw new CoffeeChatError(
        "ACCOUNT_ALREADY_LINKED",
        409,
        "That provider identity is already linked to another Coffee Chat account.",
      );
    }
    return {
      id: existing[0].id,
      providerId: existing[0].providerId,
      accountId: existing[0].accountId,
      createdAt: existing[0].createdAt.toISOString(),
    };
  }

  const [created] = await db
    .insert(accounts)
    .values({
      id: randomUUID(),
      userId,
      providerId,
      accountId: providerAccountId,
    })
    .returning();

  return {
    id: created!.id,
    providerId: created!.providerId,
    accountId: created!.accountId,
    createdAt: created!.createdAt.toISOString(),
  };
}

/**
 * Unlinks a login provider from the user's account.
 * Refuses to unlink the last remaining login method.
 */
export async function unlinkProviderAccount(
  db: CoffeeChatDb,
  userId: string,
  accountRowId: string,
): Promise<{ unlinked: boolean }> {
  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  const target = userAccounts.find((a) => a.id === accountRowId);
  if (!target) {
    throw new CoffeeChatError("NOT_FOUND", 404, "Linked account not found.");
  }

  if (userAccounts.length <= 1) {
    throw new CoffeeChatError(
      "LAST_LOGIN_METHOD",
      400,
      "Cannot unlink your last remaining login method.",
    );
  }

  await db
    .delete(accounts)
    .where(and(eq(accounts.id, accountRowId), eq(accounts.userId, userId)));

  return { unlinked: true };
}

/**
 * Deletes a user account along with owned Beans, OAuth grants/tokens, and Shelf items.
 * Never cascade-deletes other users' records.
 */
export async function deleteUserAccount(
  db: CoffeeChatDb,
  userId: string,
): Promise<{ deleted: boolean }> {
  // Revoke active OAuth grants first before cascading delete.
  await db
    .update(oauthGrants)
    .set({ revokedAt: new Date() })
    .where(eq(oauthGrants.userId, userId));

  const deleted = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return { deleted: deleted.length > 0 };
}
