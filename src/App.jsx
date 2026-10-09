import { Suspense, lazy, useEffect, useRef } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router'
import MarketingApp from '@/features/marketing/MarketingApp'
import { useYouTubeIntelligence } from '@/features/youtube/hooks'

const YoutubeApp = lazy(() =>
  import('@/features/youtube/YoutubeApp').then(m => ({ default: m.YoutubeApp }))
)
const LegalPage = lazy(() =>
  import('@/features/legal/LegalPage').then(m => ({ default: m.LegalPage }))
)
const NotFound = lazy(() => import('@/NotFound'))

function OAuthStatus({ error = false, message, retry }) {
  return (
    <main className="oauth-return" aria-live="polite" aria-busy={!error}>
      <div className="oauth-return-card">
        {error ? (
          <>
            <h1>Unable to load your YouTube workspace.</h1>
            <p>{message}</p>
            <button className="oauth-return-action" type="button" onClick={retry}>Retry</button>
          </>
        ) : (
          <>
            <span className="oauth-return-spinner" aria-hidden="true" />
            <p>{message}</p>
          </>
        )}
      </div>
    </main>
  )
}

// The backend completes OAuth at this pathname. Keep this route separate from
// the hash-driven YouTube workspace and only enter the workspace after its
// session and channel list have been verified.
function OAuthSuccess({ channelId }) {
  const navigate = useNavigate()
  const hasNavigated = useRef(false)
  const controller = useYouTubeIntelligence({
    preferredChannelId: channelId,
    useStoredChannel: false,
  })

  useEffect(() => {
    if (hasNavigated.current) return

    if (controller.authStatus === 'anonymous') {
      hasNavigated.current = true
      navigate('/test-demo#channel', { replace: true })
      return
    }

    if (controller.authStatus !== 'authenticated') return

    hasNavigated.current = true
    const channelIsValid = Boolean(channelId && controller.session.selected === channelId)
    navigate(
      channelIsValid
        ? `/test-demo?channel_id=${encodeURIComponent(channelId)}#channel`
        : '/test-demo#channel',
      { replace: true },
    )
  }, [channelId, controller.authStatus, controller.session.selected, navigate])

  if (controller.authStatus === 'error') {
    return <OAuthStatus error message={controller.error} retry={controller.reload} />
  }
  return (
    <OAuthStatus
      message={controller.authPhase === 'channels'
        ? 'Loading your YouTube channel…'
        : 'Completing YouTube authentication…'}
    />
  )
}

function OAuthReturn() {
  const { channelId } = useParams()
  const [params] = useSearchParams()

  if (params.get('auth') !== 'success') {
    const reason = params.get('reason') || 'oauth_failed'
    return <Navigate to={`/test-demo?auth=failed&reason=${encodeURIComponent(reason)}#channel`} replace />
  }

  return <OAuthSuccess channelId={channelId} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/"                     element={<MarketingApp />} />
          <Route path="/contact"              element={<MarketingApp />} />
          <Route path="/test-demo"            element={<YoutubeApp />} />
          <Route path="/dashboard"            element={<OAuthReturn />} />
          <Route path="/dashboard/:channelId" element={<OAuthReturn />} />
          <Route path="/privacy"              element={<LegalPage type="privacy" />} />
          <Route path="/terms"                element={<LegalPage type="terms" />} />
          <Route path="*"                     element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
