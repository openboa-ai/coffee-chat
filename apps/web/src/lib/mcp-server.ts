import {
  addToShelf,
  CoffeeChatError,
  comparePerspectives,
  deleteBean,
  getBean,
  getPersonProfile,
  listBeans,
  listShelf,
  prepareBean,
  removeFromShelf,
  saveBean,
  setBeanVisibility,
  type CoffeeChatDb,
  type McpScope,
  type VerifiedMcpPrincipal,
} from "@coffee-chat/core";
import {
  getMcpAppResource,
  MCP_APP_RESOURCES,
  MCP_APP_URIS,
} from "@coffee-chat/mcp-apps";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const TOOL_DEFINITIONS = [
  {
    name: "get_profile",
    title: "Get Profile",
    description:
      "Return the authenticated Coffee Chat account, public/private Bean counts, and granted MCP scopes.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    _meta: { ui: { visibility: ["model", "app"] } },
  },
  {
    name: "list_beans",
    title: "List & Search Beans",
    description:
      "Search confirmed Beans using deterministic Postgres full-text search and filters (mine, public, shelf, all_accessible). Returns compact summaries plus relation indicators (superseded, tension). Set interactive=true to open the Bean Picker MCP App.",
    inputSchema: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["mine", "public", "shelf", "all_accessible"],
        },
        query: { type: "string" },
        tag: { type: "string" },
        ownerHandle: { type: "string" },
        originUrl: { type: "string" },
        visibility: { type: "string", enum: ["private", "public"] },
        limit: { type: "number" },
        interactive: { type: "boolean" },
        reason: { type: "string" },
      },
    },
    _meta: {
      ui: {
        resourceUri: MCP_APP_URIS.beanPicker,
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "get_bean",
    title: "Get Bean Detail",
    description:
      "Retrieve the full confirmed Bean revision, version, origins, and visibility-filtered relations.",
    inputSchema: {
      type: "object",
      required: ["beanId"],
      properties: {
        beanId: { type: "string" },
      },
    },
    _meta: { ui: { visibility: ["model", "app"] } },
  },
  {
    name: "prepare_bean",
    title: "Prepare Bean for Confirmation",
    description:
      "Normalize and validate a perspective candidate without saving it. Computes the RFC 8785 JCS SHA-256 digest and operationKey and opens the Confirm Bean Card MCP App (with Markdown fallback for CLI hosts). Default visibility is always private.",
    inputSchema: {
      type: "object",
      required: ["title", "take", "tradeoff", "boundary", "origins"],
      properties: {
        beanId: { type: ["string", "null"] },
        expectedVersion: { type: ["number", "null"] },
        title: { type: "string" },
        take: { type: "string" },
        tradeoff: { type: "string" },
        boundary: { type: "string" },
        uncertainty: { type: ["string", "null"] },
        tags: { type: "array", items: { type: "string" } },
        visibility: { type: "string", enum: ["private", "public"] },
        origins: { type: "array", items: { type: "object" } },
        relations: { type: "array", items: { type: "object" } },
      },
    },
    _meta: {
      ui: {
        resourceUri: MCP_APP_URIS.confirmBean,
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "save_bean",
    title: "Save Confirmed Bean",
    description:
      "Atomically persist an explicitly owner-confirmed Bean using the exact canonical fields, RFC 8785 JCS digest, and operationKey returned by prepare_bean.",
    inputSchema: {
      type: "object",
      required: [
        "title",
        "take",
        "tradeoff",
        "boundary",
        "origins",
        "digest",
        "operationKey",
      ],
      properties: {
        beanId: { type: ["string", "null"] },
        expectedVersion: { type: ["number", "null"] },
        title: { type: "string" },
        take: { type: "string" },
        tradeoff: { type: "string" },
        boundary: { type: "string" },
        uncertainty: { type: ["string", "null"] },
        tags: { type: "array", items: { type: "string" } },
        visibility: { type: "string", enum: ["private", "public"] },
        origins: { type: "array", items: { type: "object" } },
        relations: { type: "array", items: { type: "object" } },
        digest: { type: "string" },
        operationKey: { type: "string" },
        attestationKind: { type: "string", enum: ["agent_attested", "ui_attested"] },
        redactionConfirmed: { type: "boolean" },
      },
    },
    _meta: { ui: { visibility: ["model", "app"] } },
  },
  {
    name: "set_bean_visibility",
    title: "Set Bean Visibility",
    description:
      "Change a Bean's visibility between private and public with optimistic locking (expectedVersion) and idempotency (operationKey). Publishing work_episode Beans requires redactionConfirmed=true.",
    inputSchema: {
      type: "object",
      required: ["beanId", "visibility", "expectedVersion", "operationKey"],
      properties: {
        beanId: { type: "string" },
        visibility: { type: "string", enum: ["private", "public"] },
        expectedVersion: { type: "number" },
        operationKey: { type: "string" },
        redactionConfirmed: { type: "boolean" },
      },
    },
    _meta: { ui: { visibility: ["model", "app"] } },
  },
  {
    name: "delete_bean",
    title: "Delete Bean",
    description:
      "Hard-delete an owned Bean and its revisions with expectedVersion and operationKey while retaining a content-free replay receipt.",
    inputSchema: {
      type: "object",
      required: ["beanId", "expectedVersion", "operationKey"],
      properties: {
        beanId: { type: "string" },
        expectedVersion: { type: "number" },
        operationKey: { type: "string" },
      },
    },
    _meta: { ui: { visibility: ["model", "app"] } },
  },
  {
    name: "manage_shelf",
    title: "Manage Shelf",
    description:
      "List, add, or remove public Beans or @handle authors on your Shelf (live reference only; never copies ownership).",
    inputSchema: {
      type: "object",
      required: ["action"],
      properties: {
        action: { type: "string", enum: ["list", "add", "remove"] },
        targetType: { type: "string", enum: ["person", "bean"] },
        handle: { type: "string" },
        beanId: { type: "string" },
        shelfItemId: { type: "string" },
      },
    },
    _meta: { ui: { visibility: ["model", "app"] } },
  },
  {
    name: "compare_perspectives",
    title: "Compare Perspectives",
    description:
      "Compare confirmed perspectives on the same source URL or topic side by side. Renders the Perspective Diff Card MCP App with Markdown fallback for CLI hosts.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        query: { type: "string" },
        handles: { type: "array", items: { type: "string" } },
      },
    },
    _meta: {
      ui: {
        resourceUri: MCP_APP_URIS.perspectiveDiff,
        visibility: ["model", "app"],
      },
    },
  },
] as const;

function requireScope(principal: VerifiedMcpPrincipal, scope: McpScope) {
  if (!principal.scopes.includes(scope)) {
    throw new CoffeeChatError(
      "FORBIDDEN",
      403,
      `Missing required scope: ${scope}`,
    );
  }
}

export async function handleMcpJsonRpc(
  db: CoffeeChatDb,
  principal: VerifiedMcpPrincipal,
  req: JsonRpcRequest,
): Promise<JsonRpcResponse> {
  const id = req.id ?? null;

  try {
    switch (req.method) {
      case "initialize": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2025-03-26",
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
            },
            serverInfo: {
              name: "coffee-chat-mcp",
              version: "0.1.0",
            },
          },
        };
      }

      case "notifications/initialized":
      case "ping": {
        return { jsonrpc: "2.0", id, result: {} };
      }

      case "resources/list": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            resources: MCP_APP_RESOURCES.map((r) => ({
              uri: r.uri,
              name: r.name,
              title: r.title,
              description: r.description,
              mimeType: r.mimeType,
              _meta: { ui: { prefersBorder: true } },
            })),
          },
        };
      }

      case "resources/read": {
        const uri = String(req.params?.uri ?? "");
        const resource = getMcpAppResource(uri);
        if (!resource) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32002, message: `Unknown resource: ${uri}` },
          };
        }
        return {
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri: resource.uri,
                mimeType: resource.mimeType,
                text: resource.html,
                _meta: { ui: { prefersBorder: true } },
              },
            ],
          },
        };
      }

      case "tools/list": {
        return {
          jsonrpc: "2.0",
          id,
          result: { tools: TOOL_DEFINITIONS },
        };
      }

      case "tools/call": {
        const name = String(req.params?.name ?? "");
        const args = (req.params?.arguments ?? {}) as Record<string, unknown>;
        const toolResult = await dispatchTool(db, principal, name, args);
        return { jsonrpc: "2.0", id, result: toolResult };
      }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        };
    }
  } catch (err) {
    if (err instanceof CoffeeChatError) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{ type: "text", text: `[${err.code}] ${err.message}` }],
          structuredContent: {
            error: err.code,
            message: err.message,
            ...(err.details ? { details: err.details } : {}),
          },
        },
      };
    }
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: msg },
    };
  }
}

async function dispatchTool(
  db: CoffeeChatDb,
  principal: VerifiedMcpPrincipal,
  name: string,
  args: Record<string, unknown>,
) {
  switch (name) {
    case "get_profile": {
      requireScope(principal, "beans:read");
      const profile = await getPersonProfile(db, principal.userId, principal.handle);
      const data = {
        userId: principal.userId,
        handle: principal.handle,
        displayName: principal.displayName,
        publicCount: profile.publicCount,
        privateCount: profile.privateCount,
        scopes: principal.scopes,
        grantId: principal.grantId,
      };
      return {
        content: [
          {
            type: "text",
            text: `Signed in as ${data.displayName} (@${data.handle}).\nBeans: ${data.publicCount} public · ${data.privateCount} private.\nScopes: ${data.scopes.join(", ")}`,
          },
        ],
        structuredContent: data,
      };
    }

    case "list_beans": {
      requireScope(principal, "beans:read");
      const beans = await listBeans(db, principal.userId, {
        scope: args.scope as "mine" | "public" | "shelf" | "all_accessible" | undefined,
        query: args.query as string | undefined,
        tag: args.tag as string | undefined,
        ownerHandle: args.ownerHandle as string | undefined,
        originUrl: args.originUrl as string | undefined,
        visibility: args.visibility as "private" | "public" | undefined,
        limit: args.limit as number | undefined,
      });
      const hasTension = beans.some((b) => b.hasTension);
      const lines =
        beans.length === 0
          ? ["No Beans matched."]
          : beans.map(
              (b) =>
                `- **${b.title}** (\`${b.id}\`, @${b.ownerHandle}, ${b.visibility}, v${b.version})${b.hasTension ? " [TENSION]" : ""}${b.supersededByBeanId ? " [SUPERSEDED]" : ""}\n  Trade-off: ${b.tradeoffPreview}`,
            );
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: {
          beans,
          hasTension,
          reason: args.reason as string | undefined,
        },
        ...(args.interactive || hasTension
          ? { _meta: { ui: { resourceUri: MCP_APP_URIS.beanPicker } } }
          : {}),
      };
    }

    case "get_bean": {
      requireScope(principal, "beans:read");
      const bean = await getBean(db, principal.userId, String(args.beanId ?? ""));
      const text = [
        `# ${bean.title}`,
        `Author: ${bean.ownerDisplayName} (@${bean.ownerHandle}) · ${bean.visibility} · v${bean.version} (rev ${bean.revisionNumber})`,
        "",
        `**Take:** ${bean.take}`,
        `**Priority & Trade-off:** ${bean.tradeoff}`,
        `**Boundary:** ${bean.boundary}`,
        ...(bean.uncertainty ? [`**Uncertainty:** ${bean.uncertainty}`] : []),
        "",
        "**Origins:**",
        ...bean.origins.map((o) =>
          o.kind === "source_excerpt"
            ? `- [Source] ${o.sourceTitle ?? o.url} (${o.url})${o.quotation ? ` — "${o.quotation}"` : ""}`
            : `- [Work Episode] ${o.episodeSummary}`,
        ),
        ...(bean.relations.length
          ? [
              "",
              "**Relations:**",
              ...bean.relations.map(
                (r) => `- ${r.direction} ${r.kind} → ${r.relatedBeanTitle} (${r.relatedBeanId})`,
              ),
            ]
          : []),
      ].join("\n");
      return {
        content: [{ type: "text", text }],
        structuredContent: { bean },
      };
    }

    case "prepare_bean": {
      requireScope(principal, "beans:write");
      const prepared = await prepareBean(db, principal.userId, args as never);
      const p = prepared.canonicalPayload;
      const preview = [
        "### Confirm Coffee Chat Bean (Not Saved Yet)",
        `- **Title:** ${p.title}`,
        `- **Take:** ${p.take}`,
        `- **Trade-off:** ${p.tradeoff}`,
        `- **Boundary:** ${p.boundary}`,
        `- **Visibility:** ${p.visibility} (default private)`,
        `- **Digest:** \`${prepared.digest}\``,
        `- **Operation Key:** \`${prepared.operationKey}\``,
        ...(prepared.requiresRedactionConfirmation
          ? [
              "- **Redaction Required:** This work_episode Bean is marked public; explicit confirmation that no private/proprietary data remains is required.",
            ]
          : []),
        "",
        "Confirm exact content and visibility before calling `save_bean`.",
      ].join("\n");
      return {
        content: [{ type: "text", text: preview }],
        structuredContent: { prepared },
        _meta: { ui: { resourceUri: MCP_APP_URIS.confirmBean } },
      };
    }

    case "save_bean": {
      requireScope(principal, "beans:write");
      const result = await saveBean(db, principal.userId, args as never);
      return {
        content: [
          {
            type: "text",
            text: `Saved Bean "${result.bean.title}" (\`${result.bean.id}\`, v${result.bean.version}, rev ${result.bean.revisionNumber}, ${result.bean.visibility})${result.replayed ? " [idempotent replay]" : ""}.`,
          },
        ],
        structuredContent: result,
      };
    }

    case "set_bean_visibility": {
      requireScope(principal, "beans:write");
      const result = await setBeanVisibility(db, principal.userId, args as never);
      return {
        content: [
          {
            type: "text",
            text: `Updated Bean \`${result.bean.id}\` visibility to **${result.bean.visibility}** (v${result.bean.version}).`,
          },
        ],
        structuredContent: result,
      };
    }

    case "delete_bean": {
      requireScope(principal, "beans:write");
      const result = await deleteBean(db, principal.userId, args as never);
      return {
        content: [
          {
            type: "text",
            text: `Deleted Bean \`${result.beanId}\` permanently.`,
          },
        ],
        structuredContent: result,
      };
    }

    case "manage_shelf": {
      const action = String(args.action ?? "list");
      if (action === "list") {
        requireScope(principal, "beans:read");
        const items = await listShelf(db, principal.userId);
        return {
          content: [
            {
              type: "text",
              text:
                items.length === 0
                  ? "Your Shelf is empty."
                  : items
                      .map((i) =>
                        i.targetType === "person"
                          ? `- Person: @${i.person?.handle} (${i.person?.publicBeanCount} public Beans)`
                          : `- Bean: "${i.bean?.title}" by @${i.bean?.ownerHandle}`,
                      )
                      .join("\n"),
            },
          ],
          structuredContent: { items },
        };
      }
      if (action === "add") {
        requireScope(principal, "beans:write");
        const item =
          args.targetType === "person"
            ? await addToShelf(db, principal.userId, {
                targetType: "person",
                handle: String(args.handle ?? ""),
              })
            : await addToShelf(db, principal.userId, {
                targetType: "bean",
                beanId: String(args.beanId ?? ""),
              });
        return {
          content: [{ type: "text", text: `Added to Shelf (\`${item.id}\`).` }],
          structuredContent: { item },
        };
      }
      if (action === "remove") {
        requireScope(principal, "beans:write");
        const res = await removeFromShelf(
          db,
          principal.userId,
          String(args.shelfItemId ?? ""),
        );
        return {
          content: [
            {
              type: "text",
              text: res.removed ? "Removed from Shelf." : "Shelf item not found.",
            },
          ],
          structuredContent: res,
        };
      }
      throw new CoffeeChatError(
        "VALIDATION_ERROR",
        400,
        `Unknown manage_shelf action: ${action}`,
      );
    }

    case "compare_perspectives": {
      requireScope(principal, "beans:read");
      const comparison = await comparePerspectives(db, principal.userId, {
        url: args.url as string | undefined,
        query: args.query as string | undefined,
        handles: args.handles as string[] | undefined,
      });
      const text = [
        `### Perspective Comparison: ${comparison.subject}`,
        ...comparison.perspectives.map(
          (p) =>
            `\n#### ${p.ownerDisplayName} (@${p.ownerHandle}) — ${p.title}\n- **Take:** ${p.take}\n- **Trade-off:** ${p.tradeoff}\n- **Boundary:** ${p.boundary}`,
        ),
      ].join("\n");
      return {
        content: [{ type: "text", text }],
        structuredContent: comparison,
        _meta: { ui: { resourceUri: MCP_APP_URIS.perspectiveDiff } },
      };
    }

    default:
      throw new CoffeeChatError(
        "VALIDATION_ERROR",
        400,
        `Unknown tool: ${name}`,
      );
  }
}
