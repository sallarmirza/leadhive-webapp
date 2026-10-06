import { useEffect, useRef, useState } from 'react'
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

export function YoutubeApp() {
  const [screen, setScreen] = useState(screenFromHash)
  const controller = useYouTubeIntelligence()

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

  const prevAuthRef = useRef(null)
  useEffect(() => {
    const prev = prevAuthRef.current
    const now = controller.authStatus

    // Case 1: user just logged in via OAuth (anonymous → authenticated)
    if (prev === 'anonymous' && now === 'authenticated') {
      if (controller.session.channels.length > 0) {
        window.location.hash = 'channel'
      }
      prevAuthRef.current = now
      return
    }

    // Case 2: fresh page load finished — user was already logged in
    //         (refresh, or returned from OAuth redirect)
    if (prev === 'loading' && now === 'authenticated') {
      const currentHash = window.location.hash.slice(1)
      if (!currentHash || currentHash === 'platform') {
        if (controller.session.channels.length > 0) {
          window.location.hash = 'channel'
        } else if (controller.session.selected) {
          window.location.hash = 'dashboard'
        }
      }
    }

    prevAuthRef.current = now
  }, [controller.authStatus, controller.session.channels.length, controller.session.selected])

  function navigate(next) {
    window.location.hash = next
  }

  const props = { controller, navigate }

  function renderScreen() {
    switch (screen) {
      case 'platform': return <PlatformSelection navigate={navigate} controller={controller} />
      case 'channel': return <ChannelSetup {...props} />
      case 'persona': return <PersonaSetup {...props} />
      case 'content': return <ContentSelection {...props} />
      case 'command-center': return <CommandCenter {...props} />
      case 'dashboard':
      case 'analytics':

        return (
          <div className="td-heading">
            <p className="td-eyebrow">YouTube Intelligence</p>
            <h1 tabIndex={-1}>{screen}</h1>
            <p className="td-description">This screen is coming in the next batch.</p>
          </div>
        )
    }
  }

  return <DemoShell screen={screen}>{renderScreen()}</DemoShell>
}