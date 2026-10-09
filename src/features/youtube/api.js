// ─────────────────────────────────────────────────────────────────────────
// YouTube API — real backend calls only.
// Only endpoints that exist on the backend today are implemented.
// Endpoints for videos/analytics/profile/etc. will be added when the
// backend supports them (see bottom of file for the list).
// ─────────────────────────────────────────────────────────────────────────

export class YoutubeApiError extends Error {
  constructor(message, status, code = 'http') {
    super(message)
    this.name = 'YoutubeApiError'
    this.status = status
    this.code = code
  }
}

const AUTH_TIMEOUT_MS = 12000

/**
 * Maps the frontend's expected auth paths to the backend's real paths.
 *   /auth/youtube/login  → /auth/google/login
 *   /auth/youtube/logout → /auth/logout
 * The Vite proxy forwards /auth/* to the backend.
 */
export function youtubeAuthUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (normalized === '/auth/youtube/login') return '/auth/google/login'
  if (normalized === '/auth/youtube/logout') return '/auth/logout'
  return normalized
}

async function responseBody(response) {
  const text = await response.text()
  if (!text) return null
  if (!response.headers.get('content-type')?.includes('application/json')) return text
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function detailMessage(data) {
  if (data && typeof data === 'object') {
    if ('detail' in data) {
      const detail = data.detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg
    }
    if ('message' in data && typeof data.message === 'string') return data.message
    if ('error' in data && typeof data.error === 'string') return data.error
  }
  return 'YouTube Intelligence is currently unavailable. Please try again.'
}

export async function youtubeRequest(path, options = {}) {
  const requestUrl = path.startsWith('http') ? path : path
  const requestController = new AbortController()
  const timeoutMs = options.timeoutMs
  let timedOut = false

  const abortFromCaller = () => requestController.abort(options.signal?.reason)
  if (options.signal?.aborted) abortFromCaller()
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true })

  const timeout = timeoutMs
    ? globalThis.setTimeout(() => {
        timedOut = true
        requestController.abort()
      }, timeoutMs)
    : null

  let response
  let data
  try {
    response = await fetch(requestUrl, {
      method: options.method || 'GET',
      credentials: 'include',
      signal: requestController.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.csrf ? { 'X-Leadhive-CSRF': options.csrf } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    })
    data = await responseBody(response)
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (timedOut) {
      throw new YoutubeApiError('The request timed out. Please try again.', null, 'timeout')
    }
    console.error('[YouTube API] Request failed', { path, error })
    throw new YoutubeApiError('Unable to reach YouTube Intelligence.', null, 'network')
  } finally {
    if (timeout) globalThis.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }

  if (!response.ok) {
    console.error('[YouTube API] Error response', { path, status: response.status, body: data })
    const code = response.status === 401
      ? 'unauthorized'
      : response.status === 403
        ? 'forbidden'
        : response.status >= 500
          ? 'server'
          : 'http'
    throw new YoutubeApiError(detailMessage(data), response.status, code)
  }

  return data
}

// ─────────────────────────────────────────────────────────────────────────
// Real endpoints (exist on the backend today)
// ─────────────────────────────────────────────────────────────────────────

/** GET /auth/me — check if the user is logged in. 401 if not. */
export const getAuthMe = (options = {}) =>
  youtubeRequest('/auth/me', { timeoutMs: AUTH_TIMEOUT_MS, ...options })

/** GET /auth/channels — return the signed-in user's saved YouTube channels. */
export const getAuthChannels = (options = {}) =>
  youtubeRequest('/auth/channels', { timeoutMs: AUTH_TIMEOUT_MS, ...options })

/** POST /auth/logout — clear the JWT cookie. */
export const logoutUser = () => youtubeRequest('/auth/logout', { method: 'POST' })

// ─────────────────────────────────────────────────────────────────────────
// Endpoints to be added on the backend later (uncomment when available)
// ─────────────────────────────────────────────────────────────────────────
//
// export const getWorkspace    = ()           => youtubeRequest('/api/youtube/workspace')
// export const getDashboard    = (channelId)  => youtubeRequest('/dashboard/' + encodeURIComponent(channelId))
// export const getAnalytics    = (channelId)  => youtubeRequest('/analytics/' + encodeURIComponent(channelId))
// export const getLogs         = (channelId)  => youtubeRequest('/api/logs/' + encodeURIComponent(channelId))
// export const saveProfile     = (channelId, profile) =>
//   youtubeRequest('/api/channels/' + encodeURIComponent(channelId) + '/profile', { method: 'PUT', body: profile })
// export const saveSelection   = (channelId, videoIds) =>
//   youtubeRequest('/save-selected-videos', { method: 'POST', body: { channel_id: channelId, video_ids: videoIds } })
// export const saveSchedule    = (channelId, schedule) =>
//   youtubeRequest('/api/channels/' + encodeURIComponent(channelId) + '/schedule', { method: 'PUT', body: schedule })
// export const toggleAutomation = (channelId, running) =>
//   youtubeRequest('/api/toggle-bot/' + encodeURIComponent(channelId), { method: 'POST', body: { running } })
