import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link, useLocation } from 'react-router-dom'
import AnimatedBg from '../components/AnimatedBg'
import Header from '../components/Header'
import SiteFooter from '../components/SiteFooter'
import { useLang } from '../context/LangContext'
import { homeLinkFromLocation } from '../utils/localePaths'
import { apiUrl } from '../constants/api'
import { useSeo } from '../seo/useSeo'
import './enquire.css'

const DEFAULT_SLIDER = { min: 1000, max: 20000, step: 1000, currency: 'AED' }

const DEFAULT_INDUSTRIES_RU = [
  'Недвижимость',
  'E-commerce / Ритейл',
  'Образование',
  'Медицина и здоровье',
  'FinTech',
  'B2B Услуги',
  'Гостиничный бизнес / HoReCa',
  'Логистика',
  'Другое',
]

const DEFAULT_SERVICES_RU = [
  'AI-чат-бот',
  'AI-ассистент для клиентского сервиса',
  'Автоматизация бизнес-процессов',
  'Комплексное AI-внедрение',
]

const DEFAULT_TASK_TYPES_RU = [
  'Обработка входящих заявок',
  'Квалификация лидов',
  'Поддержка клиентов 24/7',
  'Внутренняя автоматизация',
  'Интеграция систем',
  'Аналитика и отчёты',
]

const DEFAULT_INDUSTRIES_EN = [
  'Real Estate',
  'E-commerce / Retail',
  'Education',
  'Healthcare',
  'FinTech',
  'B2B Services',
  'Hospitality / HoReCa',
  'Logistics',
  'Other',
]

const DEFAULT_SERVICES_EN = [
  'AI chatbot',
  'AI assistant for customer service',
  'Business process automation',
  'Full AI implementation',
]

const DEFAULT_TASK_TYPES_EN = [
  'Inbound lead handling',
  'Lead qualification',
  '24/7 customer support',
  'Internal automation',
  'Systems integration',
  'Analytics & reporting',
]

function enquireDefaultsForLang(lang) {
  const ru = lang !== 'en'
  return {
    industries: ru ? DEFAULT_INDUSTRIES_RU : DEFAULT_INDUSTRIES_EN,
    industries_en: DEFAULT_INDUSTRIES_EN,
    services: ru ? DEFAULT_SERVICES_RU : DEFAULT_SERVICES_EN,
    services_en: DEFAULT_SERVICES_EN,
    task_types: ru ? DEFAULT_TASK_TYPES_RU : DEFAULT_TASK_TYPES_EN,
    task_types_en: DEFAULT_TASK_TYPES_EN,
    budget_slider: DEFAULT_SLIDER,
  }
}

/** Подставляет industries_en / services_en / task_types_en при lang === 'en', если списки не пустые. */
function localizeEnquireOptions(merged, lang) {
  if (lang !== 'en') return merged
  const out = { ...merged }
  const pick = (baseKey, enKey) => {
    const alt = merged[enKey]
    if (Array.isArray(alt) && alt.length) out[baseKey] = alt
  }
  pick('industries', 'industries_en')
  pick('services', 'services_en')
  pick('task_types', 'task_types_en')
  return out
}

function useAdminSettings(lang) {
  const [opts, setOpts] = useState(() => enquireDefaultsForLang(lang))

  useEffect(() => {
    const base = enquireDefaultsForLang(lang)
    setOpts(localizeEnquireOptions(base, lang))

    fetch(apiUrl('/public/enquire-form-options'), { credentials: 'omit' })
      .then(r => r.json())
      .then(data => {
        const merged = { ...base }
        data.forEach(s => {
          try { merged[s.key] = JSON.parse(s.value) } catch { /* keep default */ }
        })
        setOpts(localizeEnquireOptions(merged, lang))
      })
      .catch(() => { setOpts(localizeEnquireOptions(base, lang)) })
  }, [lang])

  return opts
}

/* ── Budget Slider component ──────────────────────────────────────── */
function BudgetSlider({ cfg, value, onChange }) {
  const { min, max, step, currency } = cfg
  const pct = ((value - min) / Math.max(max - min, 1)) * 100
  const fmt = v => `${currency} ${Number(v).toLocaleString()}`

  return (
    <div className="budget-slider-wrap">
      <div className="budget-current-value">{fmt(value)}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="budget-range-input"
        style={{ '--pct': `${pct}%` }}
      />
      <div className="budget-range-labels">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  )
}

function useBehaviorTracking() {
  const startTime = useRef(Date.now())
  const formStartTime = useRef(null)
  const scrollDepth = useRef(0)
  const buttonsClicked = useRef([])
  const cursorHovers = useRef(new Set())

  useEffect(() => {
    const returnKey = 'abl_enquire_visits'
    const visits = parseInt(sessionStorage.getItem(returnKey) || '0', 10) + 1
    sessionStorage.setItem(returnKey, String(visits))

    const onScroll = () => {
      const depth = Math.round(
        ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
      )
      if (depth > scrollDepth.current) scrollDepth.current = depth
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const trackFormStart = () => {
    if (!formStartTime.current) formStartTime.current = Date.now()
  }

  const trackClick = label => {
    if (!buttonsClicked.current.includes(label)) buttonsClicked.current.push(label)
  }

  const trackHover = section => cursorHovers.current.add(section)

  const getPayload = () => ({
    time_on_page: Math.round((Date.now() - startTime.current) / 1000),
    form_fill_time: formStartTime.current
      ? Math.round((Date.now() - formStartTime.current) / 1000)
      : 0,
    scroll_depth: scrollDepth.current,
    return_count: parseInt(sessionStorage.getItem('abl_enquire_visits') || '1', 10),
    buttons_clicked: buttonsClicked.current,
    cursor_hovers: [...cursorHovers.current],
    click_map: {},
  })

  return { trackFormStart, trackClick, trackHover, getPayload }
}

export default function Enquire() {
  const { lang, te, t } = useLang()
  const location = useLocation()
  useSeo({
    title: te.seo.docTitle,
    description: te.seo.metaDescription,
    pathname: location.pathname,
    lang,
    page: 'enquire',
    ogImage: t.seo?.ogImage,
  })

  const homeLink = homeLinkFromLocation(location.pathname, lang)
  const [searchParams] = useSearchParams()
  const opts = useAdminSettings(lang)
  const tracking = useBehaviorTracking()

  const sliderCfg = opts.budget_slider || DEFAULT_SLIDER
  const sliderMid = Math.round((sliderCfg.min + sliderCfg.max) / 2)
  const [budgetValue, setBudgetValue] = useState(sliderMid)

  /** После загрузки настроек (админка) старый mid мог остаться от max=500k — приводим к диапазону слайдера */
  useEffect(() => {
    const cfg = opts.budget_slider || DEFAULT_SLIDER
    setBudgetValue(v => {
      if (v < cfg.min || v > cfg.max) {
        return Math.round((cfg.min + cfg.max) / 2)
      }
      return v
    })
  }, [opts.budget_slider?.min, opts.budget_slider?.max])

  const [form, setForm] = useState({
    first_name: searchParams.get('name')?.split(' ')[0] || '',
    last_name: searchParams.get('name')?.split(' ').slice(1).join(' ') || '',
    phone: searchParams.get('phone') || '',
    email: '',
    business_niche: '',
    company_size: '',
    task_volume: '',
    role: '',
    business_info: '',
    task_type: '',
    interested_product: '',
    timeline: '',
    contact_preference: '',
    preferred_time: '',
    comments: '',
  })

  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)

  const handle = e => {
    tracking.trackFormStart()
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const submit = async e => {
    e.preventDefault()
    if (!form.phone.trim()) { setError(te.required); return }
    if (!privacyAccepted) { setError(te.privacyRequired); return }
    setLoading(true); setError('')
    tracking.trackClick('submit')

    const fmt = v => `${sliderCfg.currency} ${Number(v).toLocaleString()}`
    const payload = {
      ...form,
      budget: fmt(budgetValue),
      language: lang,
      referrer: document.referrer,
      utm_source: new URLSearchParams(location.search).get('utm_source') || '',
      utm_medium: new URLSearchParams(location.search).get('utm_medium') || '',
      utm_campaign: new URLSearchParams(location.search).get('utm_campaign') || '',
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      user_agent: navigator.userAgent,
      ...tracking.getPayload(),
      privacy_consent: true,
    }

    try {
      const res = await fetch(apiUrl('/leads/enquire'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      setSent(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError('Ошибка отправки. Попробуйте ещё раз. / Submission error, please retry.')
    } finally {
      setLoading(false)
    }
  }

  const F = te.fields
  const O = te.options
  const P = te.placeholders

  return (
    <>
      <AnimatedBg />
      <div className="page">
        <Header />

        <div className="enquire-page">
          <div className="enquire-hero">
            <div className="container">
              <Link to={homeLink} className="back-link">{te.backHome}</Link>
              <h1 className="enquire-h1">{te.title}</h1>
              <p className="enquire-sub">{te.sub}</p>
            </div>
          </div>

          <div className="enquire-body container">
            {sent ? (
              <div className="card success-box enquire-success">
                <div className="success-icon">✓</div>
                <div className="success-title">{te.successTitle}</div>
                <p className="success-text">{te.successText}</p>
                <Link to={homeLink} className="btn-ghost" style={{ marginTop: 24, width: 'fit-content' }}>
                  {te.backHome}
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="enquire-form" noValidate>

                {/* Section: Contact */}
                <div
                  className="form-section card"
                  onMouseEnter={() => tracking.trackHover('contact')}
                >
                  <h2 className="form-section-title">
                    <span className="form-section-num">01</span>
                    {te.sections.contact}
                  </h2>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label className="field-label">{F.first_name}</label>
                      <input name="first_name" className="field-input" value={form.first_name} onChange={handle} autoComplete="given-name" />
                    </div>
                    <div className="field-group">
                      <label className="field-label">{F.last_name}</label>
                      <input name="last_name" className="field-input" value={form.last_name} onChange={handle} autoComplete="family-name" />
                    </div>
                    <div className="field-group">
                      <label className="field-label">{F.phone}</label>
                      <input name="phone" className="field-input" value={form.phone} onChange={handle} type="tel" required autoComplete="tel" placeholder="+971 5X XXX XX XX" />
                    </div>
                    <div className="field-group">
                      <label className="field-label">{F.email}</label>
                      <input name="email" className="field-input" value={form.email} onChange={handle} type="email" autoComplete="email" placeholder="you@company.com" />
                    </div>
                  </div>
                </div>

                {/* Section: Business */}
                <div
                  className="form-section card"
                  onMouseEnter={() => tracking.trackHover('business')}
                >
                  <h2 className="form-section-title">
                    <span className="form-section-num">02</span>
                    {te.sections.business}
                  </h2>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label className="field-label">{F.business_niche}</label>
                      <select name="business_niche" className="field-select" value={form.business_niche} onChange={handle}>
                        <option value="">—</option>
                        {opts.industries.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">{F.company_size}</label>
                      <select name="company_size" className="field-select" value={form.company_size} onChange={handle}>
                        <option value="">—</option>
                        {O.company_size.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">{F.task_volume}</label>
                      <select name="task_volume" className="field-select" value={form.task_volume} onChange={handle}>
                        <option value="">—</option>
                        {O.task_volume.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">{F.role}</label>
                      <select name="role" className="field-select" value={form.role} onChange={handle}>
                        <option value="">—</option>
                        {O.role.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field-group" style={{ marginTop: 16 }}>
                    <label className="field-label">{F.business_info}</label>
                    <textarea name="business_info" className="field-textarea" value={form.business_info} onChange={handle} placeholder={P.business_info} />
                  </div>
                </div>

                {/* Section: Task */}
                <div
                  className="form-section card"
                  onMouseEnter={() => tracking.trackHover('task')}
                >
                  <h2 className="form-section-title">
                    <span className="form-section-num">03</span>
                    {te.sections.task}
                  </h2>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label className="field-label">{F.task_type}</label>
                      <select name="task_type" className="field-select" value={form.task_type} onChange={handle}>
                        <option value="">—</option>
                        {opts.task_types.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">{F.interested_product}</label>
                      <select name="interested_product" className="field-select" value={form.interested_product} onChange={handle}>
                        <option value="">—</option>
                        {opts.services.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">{F.timeline}</label>
                      <select name="timeline" className="field-select" value={form.timeline} onChange={handle}>
                        <option value="">—</option>
                        {O.timeline.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="field-group field-group--full">
                      <label className="field-label">{F.budget}</label>
                      <BudgetSlider
                        cfg={sliderCfg}
                        value={budgetValue}
                        onChange={v => { tracking.trackFormStart(); setBudgetValue(v) }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Communication */}
                <div
                  className="form-section card"
                  onMouseEnter={() => tracking.trackHover('comm')}
                >
                  <h2 className="form-section-title">
                    <span className="form-section-num">04</span>
                    {te.sections.comm}
                  </h2>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label className="field-label">{F.contact_preference}</label>
                      <div className="contact-chips">
                        {O.contact_preference.map(opt => (
                          <label key={opt} className={`contact-chip ${form.contact_preference === opt ? 'selected' : ''}`}>
                            <input
                              type="radio"
                              name="contact_preference"
                              value={opt}
                              checked={form.contact_preference === opt}
                              onChange={handle}
                              hidden
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="field-group">
                      <label className="field-label">{F.preferred_time}</label>
                      <input name="preferred_time" className="field-input" value={form.preferred_time} onChange={handle} placeholder={P.preferred_time} />
                    </div>
                  </div>
                  <div className="field-group" style={{ marginTop: 16 }}>
                    <label className="field-label">{F.comments}</label>
                    <textarea name="comments" className="field-textarea" value={form.comments} onChange={handle} placeholder={P.comments} />
                  </div>
                </div>

                {error && (
                  <div className="form-error">
                    {error}
                  </div>
                )}

                <div className="privacy-consent enquire-privacy-consent card">
                  <label className="privacy-consent__label">
                    <input
                      type="checkbox"
                      className="privacy-consent__input"
                      checked={privacyAccepted}
                      onChange={e => { tracking.trackFormStart(); setPrivacyAccepted(e.target.checked) }}
                    />
                    <span className="privacy-consent__text">{te.privacyConsent}</span>
                  </label>
                </div>

                <div className="enquire-submit">
                  <button
                    type="submit"
                    className="btn-primary enquire-btn"
                    disabled={loading}
                    onClick={() => tracking.trackClick('submit-click')}
                  >
                    {loading ? te.submitLoading : te.submit}
                  </button>
                  <p className="form-note" style={{ textAlign: 'center', marginTop: 12 }}>
                    {lang === 'ru'
                      ? 'Данные хранятся только внутри нашего сервера и никуда не передаются'
                      : 'Your data is stored only on our server and is never shared with third parties'}
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        <SiteFooter />
      </div>
    </>
  )
}
