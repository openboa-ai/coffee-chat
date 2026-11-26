import { defineConfig } from "@playwright/test";

const port = Number(process.env.COFFEE_CHAT_E2E_PORT || 3105);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    headless: true,
    channel: process.env.CI ? undefined : "chrome",
  },
  webServer: {
    command: `rm -rf /tmp/coffee-chat-e2e-pglite && COFFEE_CHAT_ENABLE_TEST_AUTH=true COFFEE_CHAT_PGLITE_DIR=/tmp/coffee-chat-e2e-pglite NEXT_PUBLIC_APP_URL=${baseURL} npm --workspace @coffee-chat/web exec -- next dev --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/connect`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
