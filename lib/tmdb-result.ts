export type TmdbResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: "unconfigured" | "upstream" | "invalid_path" };
