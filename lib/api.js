export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const e = new Error('Cannot reach the server. Check your connection and try again.'); e.status = 0; e.fields = {}; throw e;
  }
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok || !json?.success) {
    const e = new Error(json?.error?.message || 'Something went wrong. Please try again.');
    e.status = res.status; e.code = json?.error?.code; e.fields = json?.error?.fields || {}; throw e;
  }
  return json.data;
}

export const fmtDate = (d, withTime) => (d ? new Date(d).toLocaleString('en-IN', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }) : '—');
export const formatMobile = (m) => (m ? `${m.slice(0, 3)} ${m.slice(3, 8)} ${m.slice(8)}` : '');
