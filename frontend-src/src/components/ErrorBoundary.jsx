import React from 'react'

function reportToSentry(error, componentStack) {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  import('@sentry/react').then(Sentry => {
    Sentry.captureException(error, { extra: { componentStack } })
  }).catch(() => {})
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    reportToSentry(error, info.componentStack)
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    } else if (!import.meta.env.VITE_SENTRY_DSN) {
      console.error('[ErrorBoundary]', error?.name, error?.message)
    }
  }

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback
      if (Fallback) return Fallback
      const isDev = import.meta.env.DEV
      const msg = isDev
        ? String(this.state.error.message || this.state.error)
        : 'Произошла непредвиденная ошибка. Обновите страницу или откройте сайт заново.'
      return (
        <div role="alert" style={{ padding: '2rem', maxWidth: 520, margin: '4rem auto', fontFamily: 'system-ui' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Что-то пошло не так.</h2>
          <p style={{ color: '#555', marginBottom: '1rem' }}>
            {isDev
              ? 'Ниже техническое сообщение (режим разработки).'
              : 'Мы получили запись об ошибке, если настроен мониторинг. Обновите страницу или вернитесь на главную.'}
          </p>
          {isDev && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', background: '#f4f4f6', padding: '0.75rem' }}>
              {msg}
            </pre>
          )}
          <button
            type="button"
            style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
            onClick={() => this.setState({ error: null })}
          >
            Попробовать снова
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
