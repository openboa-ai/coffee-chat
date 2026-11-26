import { describe, expect, it } from "vitest";
import {
  getMcpAppResource,
  MCP_APP_MIME_TYPE,
  MCP_APP_RESOURCES,
  MCP_APP_URIS,
} from "../src/index.js";

describe("MCP Apps self-contained HTML bundles", () => {
  it("exports all 3 required ui:// resources under 10 MiB with strict self-contained HTML", () => {
    expect(MCP_APP_RESOURCES).toHaveLength(3);

    for (const resource of MCP_APP_RESOURCES) {
      expect(resource.uri.startsWith("ui://coffee-chat/")).toBe(true);
      expect(resource.mimeType).toBe(MCP_APP_MIME_TYPE);
      expect(resource.html).toContain("<!doctype html>");
      expect(resource.html).toContain('<div id="root"></div>');
      expect(resource.html).toContain("<style>");
      expect(resource.html).toContain("<script>");
      // Default CSP blocks external scripts and stylesheets.
      expect(resource.html).not.toMatch(/<script\s+src=/i);
      expect(resource.html).not.toMatch(/<link[^>]+rel=["']stylesheet["']/i);
      expect(Buffer.byteLength(resource.html, "utf8")).toBeLessThan(
        10 * 1024 * 1024,
      );
    }

    expect(getMcpAppResource(MCP_APP_URIS.confirmBean)?.name).toBe("confirm-bean");
    expect(getMcpAppResource(MCP_APP_URIS.beanPicker)?.name).toBe("bean-picker");
    expect(getMcpAppResource(MCP_APP_URIS.perspectiveDiff)?.name).toBe(
      "perspective-diff",
    );
  });
});
