export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function qs(params) {
  if (!params) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    p.set(k, v instanceof Date ? v.toISOString() : String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function api(path, { method = 'GET', body, params } = {}) {
  const res = await fetch(`/api${path}${qs(params)}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.details?.map?.((d) => `${d.path ? d.path + ': ' : ''}${d.message}`).join(', ');
    throw new ApiError(res.status, detail ? `${data.error} — ${detail}` : data.error || `Request failed (${res.status})`, data.details);
  }
  return data;
}

export const apiUrl = (path, params) => `/api${path}${qs(params)}`;
