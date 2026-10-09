import { useCallback, useEffect, useState } from "react";
import {
  YoutubeApiError,
  youtubeAuthUrl,
  youtubeRequest,
  getAuthMe,
  getAuthChannels,
  logoutUser,
} from './api'

const CHANNEL_STORAGE_KEY = 'leadhive.youtube.channel_id'
const blankProfile = {
  business_name: '',
  website: '',
  services: '',
  brand_tone: '',
  ai_rules: '',
}
const blankSchedule = {
  mode: 'all',
  target_date: '',
  start_time: '',
  end_time: '',
}
const emptySession = { channels: [], selected: null, csrf: '' }

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableString(value) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function rememberSelectedChannelId(channelId) {
  try {
    window.localStorage.setItem(CHANNEL_STORAGE_KEY, channelId)
  } catch {
    /* noop */
  }
}

function forgetSelectedChannelId() {
  try {
    window.localStorage.removeItem(CHANNEL_STORAGE_KEY)
  } catch {
    /* noop */
  }
}

function readSelectedChannelId() {
  const params = new URLSearchParams(window.location.search)
  for (const key of ['channelId', 'channel_id', 'channel', 'selected_channel', 'id']) {
    const value = stringValue(params.get(key))
    if (value) return value
  }
  try {
    return stringValue(window.localStorage.getItem(CHANNEL_STORAGE_KEY));
  } catch {
    return null;
  }
}

function readAuthResult() {
  const params = new URLSearchParams(window.location.search)
  if (params.has('error')) return 'failed'
  const auth = params.get('auth')
  if (!auth) return null
  return auth === 'failed' ? 'failed' : 'success'
}

function readAuthFailureReason() {
  if (readAuthResult() !== 'failed') return null
  return stringValue(new URLSearchParams(window.location.search).get('reason')) || 'oauth_failed'
}

function parseChannel(raw) {
  if (!raw || typeof raw !== 'object') return null
  const item = raw

  const id =
    stringValue(item.id) ||
    stringValue(item.channel_id) ||
    stringValue(item.channelId) ||
    stringValue(item.youtube_channel_id)

  if (!id) return null

  return {
    id,
    title:
      stringValue(item.title) ||
      stringValue(item.channel_title) ||
      stringValue(item.name) ||
      stringValue(item.channel_name) ||
      id,
    thumbnail:
      stringValue(item.thumbnail) ||
      stringValue(item.thumbnail_url) ||
      stringValue(item.channel_thumbnail) ||
      '',
    subscribers: nullableString(
      item.subscribers ?? item.subscriber_count ?? item.channel_subscribers,
    ),
    views: nullableString(item.views ?? item.view_count ?? item.channel_views),
    videos: nullableString(
      item.videos ?? item.video_count ?? item.channel_videos ?? item.channel_video_count,
    ),
  }
}

function extractChannels(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.channels)
      ? payload.channels
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
  return list.map(parseChannel).filter(Boolean);
}

function extractAuthFlag(payload) {
  if (payload === null || payload === undefined) return false
  if (payload === true) return true
  if (typeof payload === 'object') {
    if (payload.authenticated === true) return true
    if (payload.authenticated === false) return false
    if (payload.logged_in === true) return true
    if (payload.user_id || payload.userId) return true
    if (payload.user || payload.email) return true
    if (payload.id || payload.sub) return true
  }
  return false;
}

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function isUnauthorized(error) {
  return error instanceof YoutubeApiError && error.status === 401;
}

function authenticationErrorMessage(error, phase) {
  const endpoint = phase === 'channels' ? '/auth/channels' : '/auth/me'

  if (error instanceof YoutubeApiError) {
    if (error.status === 404) {
      return `The configured backend does not provide ${endpoint}. Verify the backend URL and restart Vite.`
    }
    if (error.code === 'timeout') return 'The authentication service timed out. Please try again.'
    if (error.code === 'network') return 'Unable to reach the configured authentication service.'
    if (error.status && error.status >= 500) {
      return 'The authentication service is temporarily unavailable. Please try again.'
    }
  }

  return errorMessage(error, 'Unable to load your YouTube workspace.')
}

export function useYoutubeResource(path, refresh = 0) {
  const requestKey = path ? `${path}:${refresh}` : null
  const [result, setResult] = useState({
    key: null,
    data: null,
    error: '',
    status: null,
  })

  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    youtubeRequest(path, { signal: controller.signal })
      .then(data => {
        setResult({ key: requestKey, data, error: '', status: null })
      })
      .catch(error => {
        if (controller.signal.aborted) return
        setResult({
          key: requestKey,
          data: null,
          error: errorMessage(error, 'Unable to load this section.'),
          status: error instanceof YoutubeApiError ? error.status : null,
        })
      })
    return () => controller.abort()
  }, [path, requestKey])

  if (!requestKey) return { data: null, error: '', status: null, loading: false }
  if (result.key !== requestKey) {
    return { data: null, error: '', status: null, loading: true }
  }
  return { ...result, loading: false }
}

export function useYouTubeIntelligence({ preferredChannelId, useStoredChannel = true } = {}) {
  const [initial] = useState(() => ({
    channelId:
      stringValue(preferredChannelId) || (useStoredChannel ? readSelectedChannelId() : null),
    authResult: readAuthResult(),
    authFailureReason: readAuthFailureReason(),
  }))
  const [refresh, setRefresh] = useState(0)
  const [authStatus, setAuthStatus] = useState(
    initial.authResult === 'failed' ? 'anonymous' : 'loading',
  )
  const [authPhase, setAuthPhase] = useState('session')
  const [session, setSession] = useState(emptySession)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [profile, setProfile] = useState(blankProfile)
  const [selection, setSelection] = useState([])
  const [schedule, setSchedule] = useState(blankSchedule)
  const [running, setRunning] = useState(false)
  const automationReady = false

  useEffect(() => {
    if (initial.authResult === 'failed') return
    const controller = new AbortController()

    async function load() {
      let phase = 'session'
      try {
        const me = await getAuthMe({ signal: controller.signal })
        if (!extractAuthFlag(me)) {
          setSession(emptySession);
          setAuthStatus("anonymous");
          return;
        }

        phase = 'channels'
        setAuthPhase('channels')
        const channelsPayload = await getAuthChannels({ signal: controller.signal })
        const channels = extractChannels(channelsPayload)

        const fromServer =
          stringValue(channelsPayload?.selected) ||
          stringValue(channelsPayload?.selected_channel_id) ||
          stringValue(channelsPayload?.current_channel_id);

        let chosen = null
        if (initial.channelId) {
          chosen = channels.some(channel => channel.id === initial.channelId)
            ? initial.channelId
            : null
        } else if (fromServer && channels.some(channel => channel.id === fromServer)) {
          chosen = fromServer
        }

        if (chosen) rememberSelectedChannelId(chosen)
        else forgetSelectedChannelId()

        setSession({
          channels,
          selected: chosen,
          csrf:
            stringValue(channelsPayload?.csrf) ||
            stringValue(channelsPayload?.csrf_token) ||
            '',
        })
        setAuthStatus('authenticated')
        setError('')
      } catch (err) {
        if (controller.signal.aborted) return;
        if (isUnauthorized(err)) {
          setSession(emptySession);
          setAuthStatus("anonymous");
          return;
        }
        setError(authenticationErrorMessage(err, phase))
        setAuthStatus('error')
      }
    }

    load()
    return () => controller.abort()
  }, [initial.authResult, initial.channelId, refresh])

  const mutate = useCallback(async (path, body, method = 'POST') => {
    if (path === '/channel') {
      const nextChannel = stringValue(body?.channel)
      if (!nextChannel) return false
      if (!session.channels.some(channel => channel.id === nextChannel)) return false
      rememberSelectedChannelId(nextChannel)
      setSession(current => ({ ...current, selected: nextChannel }))
      return true
    }

    const channelId = session.selected
    if (!channelId) {
      setError('Connect your YouTube channel before saving changes.')
      return false
    }

    setBusy(true)
    setError('')
    try {
      if (path === '/profile') {
        await youtubeRequest('/business-profile/save', {
          method: 'POST',
          body: { channel_id: channelId, ...(body || {}) },
        })
      } else if (path === '/selection') {
        const videos = Array.isArray(body?.videos) ? body.videos : []
        await youtubeRequest('/selection-videos/save', {
          method: 'POST',
          body: {
            channel_id: channelId,
            videos: videos.map(video => ({
              youtube_video_id: video.youtube_video_id,
              description: video.description || '',
            })),
          },
        })
      } else {
        console.warn(
          `[YouTube] mutate(${path}) called but backend endpoint is not yet implemented. ` +
            `Request would be: ${method} ${path}`,
          body,
        )
        return false
      }

      return true
    } catch (err) {
      if (isUnauthorized(err)) {
        setSession(emptySession)
        setAuthStatus('anonymous')
        setError('Your session expired. Please reconnect your YouTube channel.')
      } else {
        setError(errorMessage(err, 'Unable to save your changes.'))
      }
      return false
    } finally {
      setBusy(false)
    }
  }, [session.channels, session.selected])

  async function chooseChannel(channel) {
    return mutate('/channel', { channel }, 'POST')
  }

  const connect = useCallback(() => {
    window.location.assign(youtubeAuthUrl("/auth/youtube/login"));
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      if (!isUnauthorized(err)) {
        setError(errorMessage(err, "Unable to sign out."));
        return false;
      }
    }
    forgetSelectedChannelId();
    setSession(emptySession);
    setAuthStatus("anonymous");
    return true;
  }, []);

  const reload = useCallback(() => {
    setError('')
    setAuthPhase('session')
    setAuthStatus('loading')
    setRefresh(value => value + 1)
  }, [])

  return {
    session,
    authenticated: authStatus === "authenticated",
    authStatus,
    authPhase,
    authFailureReason: initial.authFailureReason,
    loading: authStatus === 'loading',
    error,
    busy,
    profile,
    setProfile,
    selection,
    setSelection,
    schedule,
    setSchedule,
    running,
    setRunning,
    automationReady,
    channel:
      session.channels.find((channel) => channel.id === session.selected) ||
      null,
    chooseChannel,
    connect,
    logout,
    mutate,
    reload,
  }
}