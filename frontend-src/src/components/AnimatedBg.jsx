import { Profiler, memo, useLayoutEffect } from 'react'

const Orbs = memo(function AnimatedBgOrbs() {
  useLayoutEffect(() => {
    if (!import.meta.env.DEV || typeof performance === 'undefined') return

    /** Два rAF после layout — грубая оценка «от монтирования DOM» до следующего покадра. */
    let canceled = false
    let r2 = 0
    const t0 = performance.now()

    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        if (canceled) return
        const gap = performance.now() - t0
        if (gap > 32) console.debug(`[AnimatedBg:rAF-gap] ~${gap.toFixed(1)}ms`)
      })
    })

    return () => {
      canceled = true
      cancelAnimationFrame(r1)
      if (r2) cancelAnimationFrame(r2)
    }
  }, [])

  return (
    <div className="anim-bg" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="orb orb-4" />
    </div>
  )
})

function onRender(id, phase, actualDuration /* , baseDuration */) {
  if (!import.meta.env.DEV || actualDuration <= 12) return
  console.debug(`[Profiler:${id}] ${phase}: ${actualDuration.toFixed(1)}ms`)
}

export default function AnimatedBg() {
  if (import.meta.env.DEV) {
    return (
      <Profiler id="AnimatedBg" onRender={onRender}>
        <Orbs />
      </Profiler>
    )
  }
  return <Orbs />
}
