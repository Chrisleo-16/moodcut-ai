import { NextResponse } from "next/server";

import { isAllowedTmdbPath, sanitizeTmdbQuery, tmdb } from "@/lib/tmdb";

type Context = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, context: Context) {
  const { path } = await context.params;
  const joined = `/${path.join("/")}`;
  if (!isAllowedTmdbPath(joined)) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }
  const params = sanitizeTmdbQuery(new URL(request.url).searchParams.entries());
  const result = await tmdb<unknown>(joined, params);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
