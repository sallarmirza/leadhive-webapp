import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

export function Preloader() {
  const [progress, setProgress] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    if (reducedMotion) {
      setIsLoaded(true)
      return
    }

    document.body.style.overflow = 'hidden'
    const duration = 2300
    const started = performance.now()
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - started
      setProgress(Math.min(100, Math.round((elapsed / duration) * 100)))
      if (elapsed >= duration) {
        window.clearInterval(timer)
        window.setTimeout(() => {
          setIsLoaded(true)
          document.body.style.overflow = ''
        }, 120)
      }
    }, 24)

    return () => {
      window.clearInterval(timer)
      document.body.style.overflow = ''
    }
  }, [reducedMotion])

  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          className="preloader-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: .28 } }}
          aria-label="Loading LeadHive AI"
        >
          <motion.div
            className="preloader-content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .5, ease: [0.16, 1, .3, 1] }}
          >
            <img className="preloader-symbol" src="/leadhive-logo.png" alt="" aria-hidden="true" />
            <p className="preloader-status">Initializing Lead Intelligence</p>
            <div
              className="preloader-progress"
              role="progressbar"
              aria-label="Introduction progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <i style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
            <span className="preloader-accessible-status" role="status">Loading LeadHive AI.</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
