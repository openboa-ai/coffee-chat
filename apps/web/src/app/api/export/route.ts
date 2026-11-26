import { NextResponse } from "next/server";
import { exportUserBeans } from "@coffee-chat/core";
import { requireCurrentUser } from "@/lib/auth";
import { getDb, handleApiError } from "@/lib/runtime";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "markdown" ? "markdown" : "json";

    const exported = await exportUserBeans(db, user.id, format);
    return new NextResponse(exported.body, {
      status: 200,
      headers: {
        "Content-Type": exported.contentType,
        "Content-Disposition": `attachment; filename="${exported.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
