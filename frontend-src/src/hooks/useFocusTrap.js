import { useEffect } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Циклический Tab внутри контейнера (модалка / боковая панель).
 */
export function useFocusTrap(active, rootRef) {
  useEffect(() => {
    if (!active || !rootRef?.current) return undefined
    const root = rootRef.current
    const prevActive = document.activeElement
    const nodes = [...root.querySelectorAll(FOCUSABLE)].filter(
      el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    )
    if (nodes.length) {
      nodes[0].focus()
    }

    const onKeyDown = e => {
      if (e.key !== 'Tab' || !nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (prevActive && typeof prevActive.focus === 'function' && document.body.contains(prevActive)) {
        prevActive.focus()
      }
    }
  }, [active, rootRef])
}
