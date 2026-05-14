import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { LangProvider } from './context/LangContext'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import './styles/global.css'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <LangProvider>
          <App />
        </LangProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
