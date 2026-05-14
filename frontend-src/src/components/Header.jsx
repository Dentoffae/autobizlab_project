import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { homeLinkFromLocation, isLandingPath, isAdminPath, homePathForLang } from '../utils/localePaths'
import './header.css'

export default function Header() {
  const { lang, setLang, t } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = isAdminPath(location.pathname)
  const isHero = !isAdmin && isLandingPath(location.pathname)
  const homeLink = isAdmin ? homePathForLang(lang) : homeLinkFromLocation(location.pathname, lang)

  const scrollToForm = () => {
    setMenuOpen(false)
    const home = homeLinkFromLocation(location.pathname, lang)
    if (!isLandingPath(location.pathname)) {
      navigate(home)
      setTimeout(() => document.getElementById('hero-form')?.scrollIntoView({ behavior: 'smooth' }), 200)
    } else {
      document.getElementById('hero-form')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className={`header ${isHero ? 'header--dark' : 'header--light'}`}>
      <div className="header-inner">

        {/* Col 1: Logo */}
        <Link to={homeLink} className="header-logo">
          <div className="logo-mark">A</div>
          <div className="logo-text">
            <div className="logo-name">{t.nav.logo}</div>
            <div className="logo-tag">{t.nav.tagline}</div>
          </div>
        </Link>

        {/* Col 2: Center offer */}
        <div className="header-center">
          <p className="header-offer">
            {lang === 'ru'
              ? 'Внедряем AI-агентов и чат-ботов, которые автоматизируют до 70% задач в вашем бизнесе'
              : 'We deploy AI agents & chatbots that automate up to 70% of your business tasks'}
          </p>
        </div>

        {/* Col 3: Phone + lang + cta */}
        <div className="header-right">
          <a href="tel:+971501648030" className="header-phone">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            {t.nav.phone}
          </a>
          <div className="header-address">Sharjah, UAE · SPC Free Zone</div>
          <div className="header-actions">
            <div className="lang-switch">
              <button type="button" className={lang === 'ru' ? 'active' : ''} onClick={() => { setMenuOpen(false); setLang('ru') }}>RU</button>
              <span>/</span>
              <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => { setMenuOpen(false); setLang('en') }}>EN</button>
            </div>
            <button type="button" className="header-cta-btn" onClick={scrollToForm}>{t.nav.audit}</button>
          </div>
        </div>

        {/* Mobile burger */}
        <button type="button" className={`burger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(m => !m)}>
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mobile-menu">
          <a href="tel:+971501648030" className="header-phone">{t.nav.phone}</a>
          <div className="lang-switch">
            <button type="button" className={lang === 'ru' ? 'active' : ''} onClick={() => { setLang('ru'); setMenuOpen(false) }}>RU</button>
            <span>/</span>
            <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => { setLang('en'); setMenuOpen(false) }}>EN</button>
          </div>
          <button type="button" className="header-cta-btn" onClick={scrollToForm}>{t.nav.audit}</button>
        </div>
      )}
    </header>
  )
}
