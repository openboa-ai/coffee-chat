import type {
  UiBeanDetail,
  UiBeanSummary,
  UiPreparedBeanData,
} from "@coffee-chat/ui";

declare global {
  interface Window {
    __COFFEE_CHAT_INITIAL_RESULT__?: {
      structuredContent?: {
        prepared?: UiPreparedBeanData;
        beans?: UiBeanSummary[];
        reason?: string;
        subject?: string;
        perspectives?: UiBeanDetail[];
      };
    };
    __COFFEE_CHAT_MOCK_TOOL_CALL__?: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      structuredContent?: Record<string, unknown>;
      isError?: boolean;
    }>;
    __COFFEE_CHAT_ON_PICK__?: (selected: UiBeanSummary[]) => void;
  }
}

export {};
