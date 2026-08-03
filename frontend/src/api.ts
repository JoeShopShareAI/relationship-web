import type { GraphData, PickerResponse, NodePositionItem, User, Rating } from './types'

async function apiFetch<T>(url: string, token?: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  fetchGraph: (base: string, ownerId: string, opts?: { maxHops?: number }, token?: string): Promise<GraphData> => {
    const params = new URLSearchParams()
    if (opts?.maxHops != null) params.set('max_hops', String(opts.maxHops))
    const qs = params.toString()
    return apiFetch(`${base}/graph/${encodeURIComponent(ownerId)}${qs ? `?${qs}` : ''}`, token)
  },

  searchUsers: (base: string, q: string, exclude?: string[], token?: string): Promise<User[]> => {
    const params = new URLSearchParams({ q })
    if (exclude?.length) params.set('exclude', exclude.join(','))
    return apiFetch(`${base}/users/search?${params}`, token)
  },

  createUser: (base: string, user: { id: string; display_name: string; host_user_id: string; photo_url?: string; notes?: string }, token?: string): Promise<User> =>
    apiFetch(`${base}/users`, token, { method: 'POST', body: JSON.stringify(user) }),

  createConnection: (base: string, conn: { owner_user_id: string; target_user_id: string; primary_type: string; types: string[] }, token?: string) =>
    apiFetch(`${base}/connections`, token, { method: 'POST', body: JSON.stringify(conn) }),

  updateConnectionTypes: (base: string, connId: number, primary_type: string, types: string[], token?: string) =>
    apiFetch(`${base}/connections/${connId}/types`, token, { method: 'PUT', body: JSON.stringify({ primary_type, types }) }),

  deleteConnection: (base: string, connId: number, token?: string): Promise<void> =>
    apiFetch(`${base}/connections/${connId}`, token, { method: 'DELETE' }),

  submitRating: (base: string, rating: { rated_user_id: string; rater_user_id: string; dimension_key: string; score: number; notes?: string }, token?: string): Promise<Rating> =>
    apiFetch(`${base}/ratings`, token, { method: 'POST', body: JSON.stringify(rating) }),

  savePositions: (base: string, ownerId: string, positions: NodePositionItem[], token?: string): Promise<NodePositionItem[]> =>
    apiFetch(`${base}/positions/${encodeURIComponent(ownerId)}`, token, {
      method: 'PUT',
      body: JSON.stringify({ positions }),
    }),

  fetchPicker: (base: string, ownerId: string, opts: { maxDepth?: number; types?: string[]; requireAlongPath?: boolean }, token?: string): Promise<PickerResponse> => {
    const params = new URLSearchParams()
    if (opts.maxDepth != null) params.set('max_depth', String(opts.maxDepth))
    if (opts.types?.length) params.set('types', opts.types.join(','))
    if (opts.requireAlongPath != null) params.set('require_along_path', String(opts.requireAlongPath))
    return apiFetch(`${base}/picker/${encodeURIComponent(ownerId)}?${params}`, token)
  },

  upsertRatingDimensions: (base: string, dimensions: Array<{ key: string; label: string; icon?: string; sort_order?: number }>, token?: string) =>
    apiFetch(`${base}/rating-dimensions`, token, { method: 'POST', body: JSON.stringify({ dimensions }) }),
}
