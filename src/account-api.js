// Calls the account server through the same origin (/api). Every call carries the header the
// server requires for state changes (ADR-003). Network failures become { unavailable: true }.
export async function api(path, { method = 'GET', body } = {}) {
  try {
    const response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: { 'X-MPS-Request': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    // A dev proxy with no server behind it answers 5xx with no JSON.
    const data = await response.json().catch(() => null);
    if (response.status >= 500 && !data?.error) return { unavailable: true };
    return { ok: response.ok, status: response.status, data: data ?? {} };
  } catch {
    return { unavailable: true };
  }
}
