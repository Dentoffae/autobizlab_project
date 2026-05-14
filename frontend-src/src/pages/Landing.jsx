import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AnimatedBg from '../components/AnimatedBg'
import Header from '../components/Header'
import SiteFooter from '../components/SiteFooter'
import { useLang } from '../context/LangContext'
import { enquirePathForLang } from '../utils/localePaths'
import { apiUrl } from '../constants/api'
import { readApiErrorMessage } from '../utils/apiErrors'
import { useSeo } from '../seo/useSeo'
import './landing.css'

export default function Landing() {
  const { t, lang } = useLang()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [landings, setLandings] = useState([])
  const [cases, setCases] = useState([])
  const [portfolioLoading, setPortfolioLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const startTime = useRef(Date.now())

  useSeo({
    title: t.seo.landingTitle,
    description: t.seo.landingDescription,
    pathname,
    lang,
    page: 'landing',
    ogImage: t.seo.ogImage,
  })

  useEffect(() => {
    let canceled = false
    Promise.all([
      fetch(apiUrl('/portfolio/landings')).then(r => (r.ok ? r.json() : [])),
      fetch(apiUrl('/portfolio/cases')).then(r => (r.ok ? r.json() : [])),
    ])
      .then(([l, c]) => {
        if (!canceled) {
          setLandings(Array.isArray(l) ? l : [])
          setCases(Array.isArray(c) ? c : [])
        }
      })
      .catch(() => {
        if (!canceled) {
          setLandings([])
          setCases([])
        }
      })
      .finally(() => {
        if (!canceled) setPortfolioLoading(false)
      })
    return () => {
      canceled = true
    }
  }, [])

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (!form.phone.trim()) { setError(lang === 'ru' ? 'Укажите телефон' : 'Please provide phone'); return }
    const consentEl = e.currentTarget?.elements?.namedItem?.('privacy_consent')
    const consentChecked = consentEl instanceof HTMLInputElement && consentEl.checked
    const consentOk = privacyAccepted || consentChecked
    if (!consentOk) { setError(t.hero.privacyRequired); return }
    setLoading(true); setError('')

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      language: lang,
      referrer: document.referrer,
      utm_source: new URLSearchParams(location.search).get('utm_source') || '',
      utm_medium: new URLSearchParams(location.search).get('utm_medium') || '',
      utm_campaign: new URLSearchParams(location.search).get('utm_campaign') || '',
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      page_time_seconds: Math.round((Date.now() - startTime.current) / 1000),
      user_agent: navigator.userAgent,
      privacy_consent: consentOk,
    }

    try {
      const res = await fetch(apiUrl('/leads/quick'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const fallback =
          lang === 'ru' ? 'Ошибка отправки. Попробуйте ещё раз.' : 'Submission error. Please try again.'
        try {
          const errBody = await res.json()
          setError(readApiErrorMessage(errBody, fallback))
        } catch {
          setError(fallback)
        }
        return
      }
      setSent(true)
      setTimeout(() => {
        navigate(`${enquirePathForLang(lang)}?name=${encodeURIComponent(form.name)}&phone=${encodeURIComponent(form.phone)}`)
      }, 1400)
    } catch {
      setError(lang === 'ru' ? 'Ошибка отправки. Попробуйте ещё раз.' : 'Submission error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Animated bg only for sections below hero */}
      <div className="below-hero-bg"><AnimatedBg /></div>
      <div className="page">
        <Header />

        {/* ══════════════════════════════════════════════════════
            HERO — dark photo background, white text
            ══════════════════════════════════════════════════════ */}
        <section className="hero" id="top">
          <div className="hero-overlay" />

          <div className="hero-content">
            {/* Top: full-width headline */}
            <div className="hero-headline">
              <p className="hero-label">{t.hero.badge}</p>
              <h1 className="hero-h1">{t.hero.h1}</h1>
            </div>

            {/* Bottom row: checks + form */}
            <div className="hero-bottom">
              <div className="hero-checks-col">
                <p className="hero-checks-label">
                  {lang === 'ru' ? 'Что вы получите:' : 'What you get:'}
                </p>
                <ul className="hero-checks">
                  {t.hero.checks.map((c, i) => (
                    <li key={i}><span className="hero-check-icon">✓</span>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="hero-right" id="hero-form">
                <div className="form-card">
                {sent ? (
                  <div className="success-box">
                    <div className="success-icon">✓</div>
                    <div className="success-title">{t.hero.successTitle}</div>
                    <p className="success-text">{t.hero.successText}</p>
                  </div>
                ) : (
                  <>
                    <h2 className="form-card-title">{t.hero.formTitle}</h2>
                    <p className="form-card-sub">{t.hero.formSub}</p>
                    <form onSubmit={submit} className="hero-form">
                      <input
                        name="name"
                        className="hero-input"
                        placeholder={t.hero.namePlaceholder + ' *'}
                        value={form.name}
                        onChange={handle}
                        autoComplete="name"
                      />
                      <input
                        name="phone"
                        className="hero-input"
                        placeholder={t.hero.phonePlaceholder + ' *'}
                        value={form.phone}
                        onChange={handle}
                        type="tel"
                        autoComplete="tel"
                        required
                      />
                      {error && <p className="form-error">{error}</p>}
                      <label className="privacy-consent privacy-consent--hero">
                        <input
                          type="checkbox"
                          name="privacy_consent"
                          className="privacy-consent__input"
                          checked={privacyAccepted}
                          onChange={e => setPrivacyAccepted(e.target.checked)}
                        />
                        <span className="privacy-consent__text">{t.hero.privacyConsent}</span>
                      </label>
                      <button type="submit" className="hero-submit-btn" disabled={loading}>
                        {loading ? t.hero.submitLoading : t.hero.submit}
                      </button>
                      <p className="form-note-hero">
                        {lang === 'ru'
                          ? 'Данные хранятся только на нашем сервере'
                          : 'Your data is stored only on our servers'}
                      </p>
                    </form>
                  </>
                )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar at bottom of hero */}
          <div className="hero-stats">
            {t.results.items.map((item, i) => (
              <div key={i} className="hero-stat">
                <span className="hero-stat-num">{item.num}</span>
                <span className="hero-stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            Below-hero sections (light bg with animated gradient)
            ══════════════════════════════════════════════════════ */}

        {/* Pain */}
        <section className="section pain-section">
          <div className="container">
            <div className="section-center">
              <span className="section-label">{lang === 'ru' ? 'Проблема' : 'Problem'}</span>
              <h2 className="section-title">{t.pain.title}</h2>
              <p className="section-sub" style={{ margin: '0 auto 48px' }}>{t.pain.sub}</p>
            </div>
            <div className="grid-4">
              {t.pain.items.map((item, i) => (
                <div key={i} className="pain-card">
                  <div className="pain-icon">{item.icon}</div>
                  <h3 className="pain-title">{item.title}</h3>
                  <p className="pain-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solutions */}
        <section className="section solutions-section">
          <div className="container">
            <div className="solutions-header">
              <div>
                <span className="section-label">{lang === 'ru' ? 'Решение' : 'Solution'}</span>
                <h2 className="section-title">{t.solutions.title}</h2>
                <p className="section-sub">{t.solutions.sub}</p>
              </div>
            </div>
            <div className="grid-4">
              {t.solutions.items.map((item, i) => (
                <div key={i} className="solution-card card">
                  <div className="solution-icon">{item.icon}</div>
                  <h3 className="solution-title">{item.title}</h3>
                  <p className="solution-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="section steps-section">
          <div className="container">
            <div className="section-center">
              <span className="section-label">{lang === 'ru' ? 'Процесс' : 'Process'}</span>
              <h2 className="section-title">{t.steps.title}</h2>
            </div>
            <div className="steps-grid">
              {t.steps.items.map((step, i) => (
                <div key={i} className="step-card">
                  <div className="step-num">{step.n}</div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-desc">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scenario */}
        <section className="section scenario-section">
          <div className="container">
            <div className="scenario-inner">
              <div className="scenario-text">
                <span className="section-label">{lang === 'ru' ? 'Пример' : 'Example'}</span>
                <h2 className="section-title">{t.scenario.title}</h2>
                <p className="scenario-note">👉 {t.scenario.note}</p>
              </div>
              <div className="scenario-flow">
                {t.scenario.steps.map((step, i) => (
                  <div key={i} className="scenario-step">
                    <div className="scenario-dot">{i + 1}</div>
                    <p>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Who */}
        <section className="section who-section">
          <div className="container">
            <div className="section-center">
              <span className="section-label">{lang === 'ru' ? 'Аудитория' : 'Audience'}</span>
              <h2 className="section-title">{t.who.title}</h2>
            </div>
            <div className="who-tags">
              {t.who.tags.map((tag, i) => (
                <span key={i} className="who-tag">{tag}</span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section cta-section">
          <div className="container">
            <div className="cta-card">
              <span className="section-label" style={{ color: 'rgba(255,255,255,0.6)' }}>AutoBizLab</span>
              <h2 className="cta-title">{t.cta.title}</h2>
              <p className="cta-sub">{t.cta.sub}</p>
              <button
                className="cta-btn-main"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                {t.cta.btn}
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            ПРИМЕРЫ ЛЕНДИНГОВ
            ══════════════════════════════════════════════════════ */}
        {portfolioLoading && (
          <section
            className="section portfolio-skeleton-strip"
            aria-busy="true"
            aria-label={lang === 'ru' ? 'Загрузка примеров' : 'Loading examples'}
          >
            <div className="container">
              <div className="section-center">
                <div className="sk-line sk-title" />
                <div className="sk-line sk-sub" />
              </div>
              <div className="sk-grid portfolio-skeleton-cards">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="sk-card portfolio-skel-card">
                    <div className="sk-card-img portfolio-skel-card-img" />
                    <div className="sk-line sk-meta" />
                    <div className="sk-line sk-text" />
                    <div className="sk-line sk-text sk-text--narrow" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {!portfolioLoading && landings.length > 0 && (() => {
          const cats = ['all', ...Array.from(new Set(landings.map(l => l.category).filter(Boolean)))]
          const filtered = activeCategory === 'all' ? landings : landings.filter(l => l.category === activeCategory)
          return (
            <section className="section landings-section" id="landings">
              <div className="container">
                <div className="section-center">
                  <span className="section-label">{lang === 'ru' ? 'Портфолио' : 'Portfolio'}</span>
                  <h2 className="section-title">{lang === 'ru' ? 'Примеры лендингов' : 'Landing Examples'}</h2>
                  <p className="section-sub">{lang === 'ru' ? 'Посадочные страницы под каждый продукт и сегмент аудитории' : 'Landing pages tailored to each product and audience segment'}</p>
                </div>

                {cats.length > 2 && (
                  <div className="portfolio-tabs">
                    {cats.map(c => (
                      <button
                        key={c}
                        className={`portfolio-tab ${activeCategory === c ? 'active' : ''}`}
                        onClick={() => setActiveCategory(c)}
                      >
                        {c === 'all' ? (lang === 'ru' ? 'Все' : 'All') : c}
                      </button>
                    ))}
                  </div>
                )}

                <div className="landings-grid">
                  {filtered.map(item => {
                    const title = (lang === 'en' && item.title_en) ? item.title_en : item.title
                    const desc  = (lang === 'en' && item.description_en) ? item.description_en : item.description
                    const cat   = (lang === 'en' && item.category_en) ? item.category_en : item.category
                    return (
                      <div key={item.id} className="landing-card">
                        {item.image_url
                          ? <img src={item.image_url} alt={title} className="landing-card-img" />
                          : <div className="landing-card-placeholder"><span>🖥</span></div>
                        }
                        <div className="landing-card-body">
                          {cat && <span className="landing-cat">{cat}</span>}
                          <h3 className="landing-card-title">{title}</h3>
                          {desc && <p className="landing-card-desc">{desc}</p>}
                          {item.link_url && (
                            <a href={item.link_url} target="_blank" rel="noreferrer" className="landing-card-link">
                              {lang === 'ru' ? 'Посмотреть →' : 'View →'}
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )
        })()}

        {/* ══════════════════════════════════════════════════════
            КЕЙСЫ
            ══════════════════════════════════════════════════════ */}
        {cases.length > 0 && (
          <section className="section cases-section" id="cases">
            <div className="container">
              <div className="section-center">
                <span className="section-label">{lang === 'ru' ? 'Результаты' : 'Results'}</span>
                <h2 className="section-title">{lang === 'ru' ? 'Кейсы' : 'Case Studies'}</h2>
                <p className="section-sub">{lang === 'ru' ? 'Реальные результаты внедрения AI-решений для наших клиентов' : 'Real AI implementation results for our clients'}</p>
              </div>

              <div className="cases-grid">
                {cases.map((item, i) => {
                  const isEn = lang === 'en'
                  const title    = (isEn && item.title_en)       ? item.title_en       : item.title
                  const desc     = (isEn && item.description_en) ? item.description_en : item.description
                  const industry = (isEn && item.industry_en)    ? item.industry_en    : item.industry
                  const rlabel   = (isEn && item.result_label_en)? item.result_label_en: item.result_label
                  const rawExtra = (isEn && item.extra_metrics_en) ? item.extra_metrics_en : item.extra_metrics
                  let extras = []
                  try { if (rawExtra) extras = JSON.parse(rawExtra) } catch {}
                  return (
                    <div key={item.id} className={`case-card ${item.is_featured ? 'case-card--featured' : ''}`}>
                      <div className="case-num">
                        {lang === 'ru' ? `Кейс №${i + 1}` : `Case #${i + 1}`}
                        {industry && <span className="case-industry">{industry}</span>}
                      </div>
                      <h3 className="case-title">{title}</h3>
                      {desc && <p className="case-desc">{desc}</p>}

                      {(item.result_metric || extras.length > 0) && (
                        <div className="case-metrics">
                          {item.result_metric && (
                            <div className="case-metric case-metric--main">
                              <span className="case-metric-num">{item.result_metric}</span>
                              {rlabel && <span className="case-metric-label">{rlabel}</span>}
                            </div>
                          )}
                          {extras.map((m, j) => (
                            <div key={j} className="case-metric">
                              <span className="case-metric-num">{m.metric}</span>
                              <span className="case-metric-label">{m.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="section faq-section">
          <div className="container">
            <div className="faq-inner">
              <div>
                <span className="section-label">FAQ</span>
                <h2 className="section-title">{t.faq.title}</h2>
              </div>
              <div className="faq-list">
                {t.faq.items.map((item, i) => (
                  <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                    <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                      {item.q}
                      <span className="faq-arrow">{openFaq === i ? '−' : '+'}</span>
                    </button>
                    {openFaq === i && <p className="faq-a">{item.a}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  )
}
