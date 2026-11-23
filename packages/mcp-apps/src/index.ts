import {
  BEAN_PICKER_HTML,
  CONFIRM_BEAN_HTML,
  PERSPECTIVE_DIFF_HTML,
} from "./generated.js";

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app" as const;

export const MCP_APP_URIS = {
  confirmBean: "ui://coffee-chat/confirm-bean.html",
  beanPicker: "ui://coffee-chat/bean-picker.html",
  perspectiveDiff: "ui://coffee-chat/perspective-diff.html",
} as const;

export interface McpAppResourceSpec {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: typeof MCP_APP_MIME_TYPE;
  html: string;
}

export const MCP_APP_RESOURCES: readonly McpAppResourceSpec[] = [
  {
    uri: MCP_APP_URIS.confirmBean,
    name: "confirm-bean",
    title: "Confirm Bean Card",
    description:
      "Review, edit, set visibility, and confirm saving a Coffee Chat Bean with exact JCS digest attestation.",
    mimeType: MCP_APP_MIME_TYPE,
    html: CONFIRM_BEAN_HTML,
  },
  {
    uri: MCP_APP_URIS.beanPicker,
    name: "bean-picker",
    title: "Brew Bean Picker",
    description:
      "Select confirmed perspectives (and resolve tensions_with conflicts) to apply to the current task.",
    mimeType: MCP_APP_MIME_TYPE,
    html: BEAN_PICKER_HTML,
  },
  {
    uri: MCP_APP_URIS.perspectiveDiff,
    name: "perspective-diff",
    title: "Perspective Diff Card",
    description:
      "Compare confirmed perspectives from different authors on the same source or topic side by side.",
    mimeType: MCP_APP_MIME_TYPE,
    html: PERSPECTIVE_DIFF_HTML,
  },
];

export function getMcpAppResource(uri: string): McpAppResourceSpec | undefined {
  return MCP_APP_RESOURCES.find((r) => r.uri === uri);
}
