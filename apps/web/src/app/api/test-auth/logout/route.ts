import { TEST_SESSION_COOKIE } from "@/lib/auth";
import { jsonNoStore } from "@/lib/runtime";

export async function POST() {
  const response = jsonNoStore({ signedOut: true });
  response.cookies.delete(TEST_SESSION_COOKIE);
  return response;
}
