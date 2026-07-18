// /api/sync — listing-source sync trigger.
// GET:  Vercel Cron (Authorization: Bearer <CRON_SECRET>, sent automatically).
// POST: manual trigger — CRON_SECRET or an admin's Supabase access token.

import { NextRequest, NextResponse } from "next/server";
import { syncAll } from "@/lib/sources/sync";
import { createServiceClient } from "@/lib/sources/service-client";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

function isCronSecret(token: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && token && token === secret);
}

export async function GET(req: NextRequest) {
  if (!isCronSecret(bearerToken(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const results = await syncAll({ force: false });
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    if (!isCronSecret(token)) {
      // Not the cron secret — must be a Supabase access token of an admin user
      const supabase = createServiceClient();
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData?.user) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();
      if (profile?.role !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    let body: { key?: string; force?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine
    }

    const results = await syncAll({ onlyKey: body.key, force: body.force ?? false });
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
