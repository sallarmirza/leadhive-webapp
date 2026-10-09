import { useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Check, Cpu, MessageCircle, Send, Sparkles } from 'lucide-react'
import { ConnectButton } from '../DemoUI'

function YouTubeMark({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21.58 7.19a2.92 2.92 0 0 0-2.05-2.07C17.72 4.64 12 4.64 12 4.64s-5.72 0-7.53.48A2.92 2.92 0 0 0 2.42 7.2C1.94 9.02 1.94 12 1.94 12s0 2.98.48 4.8a2.92 2.92 0 0 0 2.05 2.07c1.81.49 7.53.49 7.53.49s5.72 0 7.53-.49a2.92 2.92 0 0 0 2.05-2.07c.48-1.82.48-4.8.48-4.8s0-2.98-.48-4.81Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="m10 15 5-3-5-3v6Z" fill="currentColor" />
    </svg>
  )
}

function InstagramMark({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.6" cy="6.6" r="1" fill="currentColor" />
    </svg>
  )
}

function FacebookMark({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13.6 21v-8h2.75l.42-3.12H13.6V7.9c0-.9.25-1.52 1.55-1.52h1.74V3.6a23 23 0 0 0-2.54-.13c-2.5 0-4.21 1.53-4.21 4.33v2.08H7.3V13h2.84v8h3.46Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function PlatformSelection({ navigate, controller }) {
  const reduced = useReducedMotion()
  const visual = useRef(null)

  function handlePointerMove(event) {
    if (event.pointerType !== 'mouse' || !visual.current || reduced) return
    const bounds = visual.current.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8
    visual.current.style.setProperty('--yi-parallax-x', `${x.toFixed(1)}px`)
    visual.current.style.setProperty('--yi-parallax-y', `${y.toFixed(1)}px`)
  }

  function resetPointer() {
    visual.current?.style.setProperty('--yi-parallax-x', '0px')
    visual.current?.style.setProperty('--yi-parallax-y', '0px')
  }

  return (
    <section className="yi-hero-layout">
      <div className="yi-hero-ambient" aria-hidden="true">
        <span className="yi-ambient-glow yi-glow-1" />
        <span className="yi-ambient-glow yi-glow-2" />
      </div>

      <div className="yi-hero-content">
        <motion.div
          className="yi-hero-kicker"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <Sparkles size={13} className="yi-kicker-icon" />
          <span>LeadHive AI · Autonomous Intelligence</span>
        </motion.div>

        <motion.h1
          tabIndex={-1}
          className="yi-hero-title"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          AI-Powered YouTube Intelligence
        </motion.h1>

        <motion.p
          className="yi-hero-desc"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Connect your channel, monitor high-impact content, and deploy an autonomous AI persona that represents your brand voice in community engagement.
        </motion.p>

        <motion.div
          className="yi-hero-actions"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduced ? 0 : 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {!controller?.authenticated && <ConnectButton />}
          <button className="td-button td-button-secondary yi-action-explore" onClick={() => navigate('dashboard')}>
            Explore Workspace <ArrowRight size={15} className="yi-btn-arrow" />
          </button>
        </motion.div>

        <motion.div
          className="yi-hero-trust"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.26, duration: 0.5 }}
        >
          <span>
            <Check size={14} className="yi-trust-check" /> Google-verified OAuth & permissions
          </span>
          <span>
            <Check size={14} className="yi-trust-check" /> Real-time comment monitoring
          </span>
        </motion.div>
      </div>

      <motion.div
        ref={visual}
        className="yi-network-card"
        aria-label="LeadHive Intelligence Network data-flow from YouTube channel through AI core to engagement"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
        initial={reduced ? false : { opacity: 0, scale: 0.98, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 0.16, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="yi-network-backdrop" aria-hidden="true">
          <div className="yi-network-grid" />
          <div className="yi-network-glow" />
        </div>

        <svg className="yi-network-svg" viewBox="0 0 540 440" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="yi-path-active-gradient" x1="120" y1="80" x2="270" y2="210" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ef4444" stopOpacity="0.75" />
              <stop offset="0.55" stopColor="#2cc1df" stopOpacity="0.9" />
              <stop offset="1" stopColor="#2563eb" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="yi-path-out-gradient" x1="270" y1="230" x2="420" y2="350" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2cc1df" stopOpacity="0.8" />
              <stop offset="1" stopColor="#2563eb" stopOpacity="0.7" />
            </linearGradient>
            <filter id="yi-signal-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path id="yi-curve-input" className="yi-path-active" d="M 125,84 C 185,84 210,165 270,188" />
          <path id="yi-curve-output" className="yi-path-output" d="M 270,235 C 330,260 360,350 415,354" />

          <path className="yi-path-passive" d="M 295,190 C 350,150 375,84 415,84" />
          <path className="yi-path-passive" d="M 125,354 C 185,354 210,285 245,235" />
          <path className="yi-path-passive" d="M 430,215 C 375,215 340,215 320,215" />

          <circle className="yi-moving-signal yi-signal-in" r="4.5" filter="url(#yi-signal-glow)">
            <animateMotion dur="6.5s" repeatCount="indefinite" path="M 125,84 C 185,84 210,165 270,188" />
          </circle>
          <circle className="yi-moving-signal yi-signal-trail" r="2.5">
            <animateMotion dur="6.5s" begin="0.15s" repeatCount="indefinite" path="M 125,84 C 185,84 210,165 270,188" />
          </circle>

          <circle className="yi-moving-signal yi-signal-out" r="4" filter="url(#yi-signal-glow)">
            <animateMotion dur="6.5s" begin="3.2s" repeatCount="indefinite" path="M 270,235 C 330,260 360,350 415,354" />
          </circle>
        </svg>

        <div className="yi-net-node yi-node-active-yt">
          <span className="yi-net-mark yi-mark-yt">
            <YouTubeMark size={16} />
          </span>
          <div className="yi-net-info">
            <strong>YouTube</strong>
            <span className="yi-net-status yi-status-live">
              <i /> Active Sync
            </span>
          </div>
        </div>

        <div className="yi-net-node yi-node-passive yi-node-wa">
          <span className="yi-net-mark yi-mark-wa">
            <MessageCircle size={15} />
          </span>
          <div className="yi-net-info">
            <strong>WhatsApp</strong>
            <span className="yi-net-status">Coming soon</span>
          </div>
        </div>

        <div className="yi-net-core">
          <div className="yi-core-inner">
            <span className="yi-core-icon-wrap">
              <Cpu size={22} className="yi-core-icon" />
            </span>
            <div className="yi-core-brand">
              <strong>LeadHive AI</strong>
              <small>Intelligence Core</small>
            </div>
            <div className="yi-core-status-cycle" aria-hidden="true">
              <b>Listening</b>
              <b>Understanding</b>
              <b>Responding</b>
            </div>
          </div>
          <span className="yi-core-pulse-ring" aria-hidden="true" />
        </div>

        <div className="yi-net-node yi-node-passive yi-node-ig">
          <span className="yi-net-mark yi-mark-ig">
            <InstagramMark size={15} />
          </span>
          <div className="yi-net-info">
            <strong>Instagram</strong>
            <span className="yi-net-status">Coming soon</span>
          </div>
        </div>

        <div className="yi-net-node yi-node-passive yi-node-fb">
          <span className="yi-net-mark yi-mark-fb">
            <FacebookMark size={15} />
          </span>
          <div className="yi-net-info">
            <strong>Facebook</strong>
            <span className="yi-net-status">Coming soon</span>
          </div>
        </div>

        <div className="yi-net-node yi-node-output">
          <span className="yi-net-mark yi-mark-eng">
            <Send size={15} />
          </span>
          <div className="yi-net-info">
            <strong>Engagement Ready</strong>
            <span className="yi-net-status yi-status-eng">
              <i /> AI Response Prepared
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  )
}