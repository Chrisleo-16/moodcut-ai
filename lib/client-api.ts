export class CatalogueError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function fetchCatalogue<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`/api/tmdb${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url);
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new CatalogueError(response.status, body?.error ?? "upstream");
  }
  return body as T;
}
