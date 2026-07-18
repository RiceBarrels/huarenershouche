const IS_STATIC = process.env.NEXT_PUBLIC_OUTPUT === "static";

/**
 * Convert a dynamic route path to a query-param path for static export.
 *
 * Server mode:  /car/abc123        → /car/abc123
 * Static mode:  /car/abc123        → /car?id=abc123
 * Static mode:  /car/abc123/edit   → /car/edit?id=abc123
 * Static mode:  /user/abc123       → /user?id=abc123
 */
export function staticLink(
  path: string,
  params: Record<string, string>,
): string {
  if (!IS_STATIC) return path;

  const query = new URLSearchParams(params).toString();
  // Strip dynamic segments from the path
  const parts = path.split("/").filter(Boolean);
  const staticParts = parts.filter((p) => !Object.values(params).includes(p));
  const base = "/" + staticParts.join("/");
  return `${base}?${query}`;
}

export function carLink(id: string): string {
  return staticLink(`/car/${id}`, { id });
}

export function carEditLink(id: string): string {
  return staticLink(`/car/${id}/edit`, { id });
}

export function userLink(id: string): string {
  return staticLink(`/user/${id}`, { id });
}

export function communityPostLink(id: string): string {
  return staticLink(`/community/${id}`, { id });
}

export function qaQuestionLink(id: string): string {
  return staticLink(`/qa/${id}`, { id });
}

export function adminUserLink(id: string): string {
  return staticLink(`/admin/user/${id}`, { id });
}
