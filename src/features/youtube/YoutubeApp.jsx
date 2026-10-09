import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import './styles/workspace.css'
import './styles/intelligence.css'
import './styles/premium.css'
import { DemoShell } from './DemoShell'
import { PlatformSelection } from './screens/PlatformSelection'
import { ChannelSetup } from './screens/ChannelSetup'
import { PersonaSetup } from './screens/PersonaSetup'
import { ContentSelection } from './screens/ContentSelection'
import { CommandCenter } from './screens/CommandCenter'
import { screenFromHash } from './types'
import { useYouTubeIntelligence } from './hooks'

const oauthFailureMessages = {
  channel_fetch: "We couldn't retrieve your YouTube channel.",
  access_denied: 'YouTube permission was not granted.',
  no_youtube_channel: 'No YouTube channel was found for this Google account.',
  oauth_failed: 'Authentication could not be completed.',
  session_failed: 'Your login session could not be verified.',
}

function SessionStatus({ error, onRetry }) {
  return (
    <main className="td-session-loading" aria-live="polite" aria-busy={!error}>
      {error ? (
        <div className="td-session-error">
          <h1>Unable to load your YouTube workspace.</h1>
          <p>{error}</p>
          <button className="td-button td-button-primary" type="button" onClick={onRetry}>Retry</button>
        </div>
      ) : (
        <>
          <span className="td-session-spinner" aria-hidden="true" />
          <p>Loading your YouTube workspace...</p>
        </>
      )}
    </main>
  )
}

function OAuthFailure({ reason, retry }) {
  const message = oauthFailureMessages[reason] || oauthFailureMessages.oauth_failed
  return (
    <main className="td-session-loading">
      <div className="td-session-error" role="alert">
        <h1>We couldn't connect your YouTube channel.</h1>
        <p>{message}</p>
        <button className="td-button td-button-primary" type="button" onClick={retry}>Try Again</button>
      </div>
    </main>
  )
}

export function YoutubeApp() {
  const [screen, setScreen] = useState(screenFromHash)
  const controller = useYouTubeIntelligence()
  const location = useLocation()
  const routerNavigate = useNavigate()
  const prevAuthRef = useRef(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'YouTube Intelligence | LeadHive AI'
    const onHashChange = () => setScreen(screenFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => {
      document.title = previousTitle
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const temporaryKeys = ['auth', 'error', 'reason', 'channelId', 'channel_id']
    if (!temporaryKeys.some(key => params.has(key))) return

    for (const key of temporaryKeys) params.delete(key)
    routerNavigate(
      { pathname: location.pathname, search: params.toString(), hash: location.hash },
      { replace: true },
    )
  }, [location.hash, location.pathname, location.search, routerNavigate])

  useEffect(() => {
    const prev = prevAuthRef.current
    const now = controller.authStatus
    const currentHash = window.location.hash.slice(1)

    if (now === 'anonymous') {
      if (currentHash && currentHash !== 'platform' && currentHash !== 'channel') {
        window.location.hash = 'channel'
      }
      prevAuthRef.current = now
      return
    }

    if (now === 'authenticated') {
      const justLoggedIn = prev === 'anonymous'
      const finishedInitialLoad = prev === 'loading' || prev === null

      if (justLoggedIn || finishedInitialLoad) {
        if (!currentHash || currentHash === 'platform') {
          if (controller.session.channels.length > 0) {
            window.location.hash = 'channel'
          } else if (controller.session.selected) {
            window.location.hash = 'dashboard'
          } else {
            window.location.hash = 'channel'
          }
        }
      }
    }

    prevAuthRef.current = now
  }, [controller.authStatus, controller.session.channels.length, controller.session.selected])

  function navigate(next) {
    window.location.hash = next
  }

  const props = { controller, navigate }

  function renderScreen(activeScreen = screen) {
    switch (activeScreen) {
      case 'platform':
        return <PlatformSelection navigate={navigate} controller={controller} />
      case 'channel':
        return <ChannelSetup {...props} />
      case 'persona':
        return <PersonaSetup {...props} />
      case 'content':
        return <ContentSelection {...props} />
      case 'command-center':
        return <CommandCenter {...props} />
      case 'dashboard':
      case 'analytics':
      default:
        return (
          <div className="td-heading">
            <p className="td-eyebrow">YouTube Intelligence</p>
            <h1 tabIndex={-1}>{activeScreen}</h1>
            <p className="td-description">This screen is coming in the next batch.</p>
          </div>
        )
    }
  }

  if (controller.authFailureReason) {
    return <OAuthFailure reason={controller.authFailureReason} retry={controller.connect} />
  }
  if (controller.loading) return <SessionStatus />
  if (controller.authStatus === 'error') {
    return <SessionStatus error={controller.error} onRetry={controller.reload} />
  }

  const currentHash = window.location.hash.slice(1)
  let resolvedScreen = screen
  if (controller.authenticated && (!currentHash || currentHash === 'platform')) {
    resolvedScreen = 'channel'
  } else if (
    controller.authStatus === 'anonymous' &&
    currentHash &&
    currentHash !== 'platform' &&
    currentHash !== 'channel'
  ) {
    resolvedScreen = 'channel'
  }

  return <DemoShell screen={resolvedScreen}>{renderScreen(resolvedScreen)}</DemoShell>
}