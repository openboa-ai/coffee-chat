import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { CoffeeChatDb } from "../db/client.js";
import {
  oauthAuthCodes,
  oauthClients,
  oauthGrants,
  oauthTokens,
  users,
} from "../db/schema.js";
import { CoffeeChatError } from "../types.js";
import { assertSafeCimdUrl } from "../url.js";

export const ALLOWED_MCP_SCOPES = [
  "beans:read",
  "beans:write",
  "offline_access",
] as const;

export type McpScope = (typeof ALLOWED_MCP_SCOPES)[number];

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function hashOpaque(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

function generateOpaqueToken(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function computePkceS256(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function normalizeScopes(raw: string | string[]): McpScope[] {
  const list = Array.isArray(raw)
    ? raw
    : raw
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

  const unique = new Set<McpScope>();
  for (const s of list) {
    if ((ALLOWED_MCP_SCOPES as readonly string[]).includes(s)) {
      unique.add(s as McpScope);
    } else {
      throw new CoffeeChatError(
        "VALIDATION_ERROR",
        400,
        `Unsupported OAuth scope: "${s}"`,
      );
    }
  }
  if (unique.size === 0) {
    unique.add("beans:read");
  }
  return Array.from(unique);
}

export function validateRedirectUri(uri: string): string {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new CoffeeChatError("VALIDATION_ERROR", 400, "Invalid redirect_uri.");
  }

  const isLoopback =
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]");
  const isHttps = parsed.protocol === "https:";
  const isCustomAppScheme =
    /^[a-z][a-z0-9+.-]*:$/.test(parsed.protocol) &&
    parsed.protocol !== "javascript:" &&
    parsed.protocol !== "data:" &&
    parsed.protocol !== "file:";

  if (!isHttps && !isLoopback && !isCustomAppScheme) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "redirect_uri must use https, loopback http, or an allowed custom scheme.",
    );
  }
  if (parsed.hash) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "redirect_uri must not contain a fragment.",
    );
  }
  return parsed.toString();
}

/**
 * Dynamic Client Registration (DCR) for OAuth 2.1 MCP clients.
 */
export async function registerOAuthClientDcr(
  db: CoffeeChatDb,
  input: { clientName: string; redirectUris: string[] },
): Promise<{
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  token_endpoint_auth_method: "none";
}> {
  if (!input.clientName.trim()) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "client_name is required.",
    );
  }
  if (!input.redirectUris.length) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "At least one redirect_uri is required.",
    );
  }

  const redirectUris = input.redirectUris.map(validateRedirectUri);
  const clientId = `cc_dcr_${randomUUID().replace(/-/g, "")}`;

  await db.insert(oauthClients).values({
    clientId,
    clientName: input.clientName.trim(),
    registrationKind: "dcr",
    redirectUris,
    metadataUrl: null,
  });

  return {
    client_id: clientId,
    client_name: input.clientName.trim(),
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
  };
}

/**
 * Client ID Metadata Document (CIMD) registration.
 * Strictly validates URL safety (SSRF guard) before storing or fetching.
 */
export async function registerOAuthClientCimd(
  db: CoffeeChatDb,
  input: {
    clientIdUrl: string;
    clientName: string;
    redirectUris: string[];
  },
): Promise<{
  client_id: string;
  client_name: string;
  redirect_uris: string[];
}> {
  const safeUrl = assertSafeCimdUrl(input.clientIdUrl);
  const redirectUris = input.redirectUris.map(validateRedirectUri);
  const clientId = safeUrl.toString();

  const existing = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);

  if (existing[0]) {
    return {
      client_id: existing[0].clientId,
      client_name: existing[0].clientName,
      redirect_uris: existing[0].redirectUris,
    };
  }

  await db.insert(oauthClients).values({
    clientId,
    clientName: input.clientName.trim() || safeUrl.hostname,
    registrationKind: "cimd",
    redirectUris,
    metadataUrl: clientId,
  });

  return {
    client_id: clientId,
    client_name: input.clientName.trim() || safeUrl.hostname,
    redirect_uris: redirectUris,
  };
}

/**
 * Approves user consent and issues a fresh grant + single-use PKCE authorization code.
 * Re-consent ALWAYS creates a new grantId and NEVER reactivates a revoked grant.
 */
export async function approveOAuthAuthorization(
  db: CoffeeChatDb,
  input: {
    userId: string;
    clientId: string;
    redirectUri: string;
    resource: string;
    scopes: string | string[];
    codeChallenge: string;
    codeChallengeMethod: string;
  },
): Promise<{ code: string; grantId: string }> {
  if (input.codeChallengeMethod !== "S256" || input.codeChallenge.length < 32) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "PKCE S256 code_challenge is required.",
    );
  }

  const [client] = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, input.clientId))
    .limit(1);

  if (!client) {
    throw new CoffeeChatError("UNAUTHORIZED", 401, "Unknown OAuth client.");
  }

  const normalizedRedirect = validateRedirectUri(input.redirectUri);
  if (!client.redirectUris.includes(normalizedRedirect)) {
    throw new CoffeeChatError(
      "VALIDATION_ERROR",
      400,
      "redirect_uri is not registered for this client.",
    );
  }

  const scopes = normalizeScopes(input.scopes);
  const grantId = randomUUID();
  const code = generateOpaqueToken("cc_code");

  await db.transaction(async (tx) => {
    await tx.insert(oauthGrants).values({
      id: grantId,
      userId: input.userId,
      clientId: client.clientId,
      resource: input.resource,
      scopes,
      revokedAt: null,
    });

    await tx.insert(oauthAuthCodes).values({
      codeHash: hashOpaque(code),
      grantId,
      clientId: client.clientId,
      userId: input.userId,
      redirectUri: normalizedRedirect,
      resource: input.resource,
      scopes,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: "S256",
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
      consumedAt: null,
    });
  });

  return { code, grantId };
}

export interface TokenExchangeResult {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
  refresh_token?: string;
  grant_id: string;
}

/**
 * Exchanges a single-use authorization code + PKCE verifier for opaque access & refresh tokens.
 */
export async function exchangeAuthorizationCode(
  db: CoffeeChatDb,
  input: {
    code: string;
    clientId: string;
    redirectUri: string;
    codeVerifier: string;
    resource?: string;
  },
): Promise<TokenExchangeResult> {
  const codeHash = hashOpaque(input.code);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(oauthAuthCodes)
      .where(eq(oauthAuthCodes.codeHash, codeHash))
      .limit(1);

    if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new CoffeeChatError(
        "UNAUTHORIZED",
        401,
        "Invalid or expired authorization code.",
      );
    }

    if (
      row.clientId !== input.clientId ||
      row.redirectUri !== validateRedirectUri(input.redirectUri)
    ) {
      throw new CoffeeChatError(
        "UNAUTHORIZED",
        401,
        "Client or redirect_uri mismatch.",
      );
    }

    if (input.resource && input.resource !== row.resource) {
      throw new CoffeeChatError(
        "UNAUTHORIZED",
        401,
        "Resource audience mismatch.",
      );
    }

    const expectedChallenge = computePkceS256(input.codeVerifier);
    if (expectedChallenge !== row.codeChallenge) {
      throw new CoffeeChatError(
        "UNAUTHORIZED",
        401,
        "PKCE code_verifier verification failed.",
      );
    }

    // Check grant is still active before issuing tokens.
    const [grant] = await tx
      .select()
      .from(oauthGrants)
      .where(eq(oauthGrants.id, row.grantId))
      .limit(1);

    if (!grant || grant.revokedAt) {
      throw new CoffeeChatError(
        "UNAUTHORIZED",
        401,
        "OAuth grant has been revoked.",
      );
    }

    await tx
      .update(oauthAuthCodes)
      .set({ consumedAt: new Date() })
      .where(eq(oauthAuthCodes.codeHash, codeHash));

    const accessToken = generateOpaqueToken("cc_at");
    const hasOffline = row.scopes.includes("offline_access");
    const refreshToken = hasOffline
      ? generateOpaqueToken("cc_rt")
      : undefined;

    await tx.insert(oauthTokens).values({
      tokenHash: hashOpaque(accessToken),
      tokenType: "access",
      grantId: grant.id,
      userId: row.userId,
      clientId: row.clientId,
      resource: row.resource,
      scopes: row.scopes,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
      revokedAt: null,
    });

    if (refreshToken) {
      await tx.insert(oauthTokens).values({
        tokenHash: hashOpaque(refreshToken),
        tokenType: "refresh",
        grantId: grant.id,
        userId: row.userId,
        clientId: row.clientId,
        resource: row.resource,
        scopes: row.scopes,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        revokedAt: null,
      });
    }

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: row.scopes.join(" "),
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
      grant_id: grant.id,
    };
  });
}

/**
 * Rotates a refresh token into a fresh opaque access & refresh token pair.
 * Fails immediately if the refresh token OR its parent grant is revoked.
 */
export async function refreshOAuthToken(
  db: CoffeeChatDb,
  input: {
    refreshToken: string;
    clientId: string;
    resource?: string;
  },
): Promise<TokenExchangeResult> {
  const tokenHash = hashOpaque(input.refreshToken);

  return db.transaction(async (tx) => {
    const [tokenRow] = await tx
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.tokenHash, tokenHash),
          eq(oauthTokens.tokenType, "refresh"),
        ),
      )
      .limit(1);

    if (
      !tokenRow ||
      tokenRow.revokedAt ||
      tokenRow.expiresAt.getTime() <= Date.now()
    ) {
      throw new CoffeeChatError(
        "UNAUTHORIZED",
        401,
        "Invalid, expired, or revoked refresh token.",
      );
    }

    if (tokenRow.clientId !== input.clientId) {
      throw new CoffeeChatError("UNAUTHORIZED", 401, "Client mismatch.");
    }

    if (input.resource && input.resource !== tokenRow.resource) {
      throw new CoffeeChatError("UNAUTHORIZED", 401, "Resource mismatch.");
    }

    // Re-check parent grant inside the same transaction to prevent refresh/revoke race.
    const [grant] = await tx
      .select()
      .from(oauthGrants)
      .where(eq(oauthGrants.id, tokenRow.grantId))
      .limit(1);

    if (!grant || grant.revokedAt) {
      throw new CoffeeChatError(
        "UNAUTHORIZED",
        401,
        "OAuth grant has been revoked.",
      );
    }

    // Rotate the consumed refresh token atomically.
    const rotated = await tx
      .update(oauthTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(oauthTokens.tokenHash, tokenHash),
          isNull(oauthTokens.revokedAt),
        ),
      )
      .returning({ tokenHash: oauthTokens.tokenHash });

    if (rotated.length === 0) {
      throw new CoffeeChatError(
        "UNAUTHORIZED",
        401,
        "Refresh token was already used or revoked.",
      );
    }

    const newAccess = generateOpaqueToken("cc_at");
    const newRefresh = generateOpaqueToken("cc_rt");

    await tx.insert(oauthTokens).values([
      {
        tokenHash: hashOpaque(newAccess),
        tokenType: "access",
        grantId: grant.id,
        userId: tokenRow.userId,
        clientId: tokenRow.clientId,
        resource: tokenRow.resource,
        scopes: tokenRow.scopes,
        expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
        revokedAt: null,
      },
      {
        tokenHash: hashOpaque(newRefresh),
        tokenType: "refresh",
        grantId: grant.id,
        userId: tokenRow.userId,
        clientId: tokenRow.clientId,
        resource: tokenRow.resource,
        scopes: tokenRow.scopes,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        revokedAt: null,
      },
    ]);

    return {
      access_token: newAccess,
      token_type: "Bearer",
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      scope: tokenRow.scopes.join(" "),
      refresh_token: newRefresh,
      grant_id: grant.id,
    };
  });
}

export interface VerifiedMcpPrincipal {
  userId: string;
  handle: string;
  displayName: string;
  grantId: string;
  clientId: string;
  resource: string;
  scopes: McpScope[];
}

/**
 * Uncached, per-request opaque access token introspection.
 * Verifies token existence, active status, expiration, parent grant status,
 * expected resource audience, and required scope.
 */
export async function verifyAccessToken(
  db: CoffeeChatDb,
  rawToken: string,
  expectedResource: string,
  requiredScope?: McpScope,
): Promise<VerifiedMcpPrincipal> {
  const tokenHash = hashOpaque(rawToken);

  const [tokenRow] = await db
    .select()
    .from(oauthTokens)
    .where(
      and(
        eq(oauthTokens.tokenHash, tokenHash),
        eq(oauthTokens.tokenType, "access"),
      ),
    )
    .limit(1);

  if (
    !tokenRow ||
    tokenRow.revokedAt ||
    tokenRow.expiresAt.getTime() <= Date.now()
  ) {
    throw new CoffeeChatError(
      "UNAUTHORIZED",
      401,
      "Access token is invalid, expired, or revoked.",
    );
  }

  if (tokenRow.resource !== expectedResource) {
    throw new CoffeeChatError(
      "UNAUTHORIZED",
      401,
      "Access token audience does not match this MCP resource.",
    );
  }

  const [grant] = await db
    .select()
    .from(oauthGrants)
    .where(eq(oauthGrants.id, tokenRow.grantId))
    .limit(1);

  if (!grant || grant.revokedAt) {
    throw new CoffeeChatError(
      "UNAUTHORIZED",
      401,
      "OAuth grant has been revoked.",
    );
  }

  const scopes = tokenRow.scopes as McpScope[];
  if (requiredScope && !scopes.includes(requiredScope)) {
    throw new CoffeeChatError(
      "FORBIDDEN",
      403,
      `Missing required scope: ${requiredScope}`,
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, tokenRow.userId))
    .limit(1);

  if (!user) {
    throw new CoffeeChatError("UNAUTHORIZED", 401, "User not found.");
  }

  return {
    userId: user.id,
    handle: user.handle,
    displayName: user.name,
    grantId: grant.id,
    clientId: tokenRow.clientId,
    resource: tokenRow.resource,
    scopes,
  };
}

export interface OAuthGrantView {
  id: string;
  clientId: string;
  clientName: string;
  resource: string;
  scopes: string[];
  revokedAt: string | null;
  createdAt: string;
}

export async function listUserGrants(
  db: CoffeeChatDb,
  userId: string,
): Promise<OAuthGrantView[]> {
  const rows = await db
    .select({
      id: oauthGrants.id,
      clientId: oauthGrants.clientId,
      clientName: oauthClients.clientName,
      resource: oauthGrants.resource,
      scopes: oauthGrants.scopes,
      revokedAt: oauthGrants.revokedAt,
      createdAt: oauthGrants.createdAt,
    })
    .from(oauthGrants)
    .innerJoin(oauthClients, eq(oauthGrants.clientId, oauthClients.clientId))
    .where(eq(oauthGrants.userId, userId));

  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    clientName: r.clientName,
    resource: r.resource,
    scopes: r.scopes,
    revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Atomically revokes an OAuth grant AND all access/refresh tokens tied to it.
 * A revoked grant ID is never reactivated.
 */
export async function revokeUserGrant(
  db: CoffeeChatDb,
  userId: string,
  grantId: string,
): Promise<{ revoked: boolean }> {
  const now = new Date();
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(oauthGrants)
      .set({ revokedAt: now })
      .where(and(eq(oauthGrants.id, grantId), eq(oauthGrants.userId, userId)))
      .returning({ id: oauthGrants.id });

    if (updated.length === 0) {
      throw new CoffeeChatError("NOT_FOUND", 404, "OAuth grant not found.");
    }

    await tx
      .update(oauthTokens)
      .set({ revokedAt: now })
      .where(eq(oauthTokens.grantId, grantId));

    await tx
      .update(oauthAuthCodes)
      .set({ consumedAt: now })
      .where(eq(oauthAuthCodes.grantId, grantId));

    return { revoked: true };
  });
}
