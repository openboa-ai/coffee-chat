import { toNextJsHandler } from "better-auth/next-js";
import { createBetterAuthInstance } from "@/lib/auth";
import { getDb } from "@/lib/runtime";

export async function GET(request: Request) {
  const db = await getDb();
  const auth = await createBetterAuthInstance(db);
  return toNextJsHandler(auth).GET(request);
}

export async function POST(request: Request) {
  const db = await getDb();
  const auth = await createBetterAuthInstance(db);
  return toNextJsHandler(auth).POST(request);
}
