import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLang } from '../context/LangContext'
import { apiUrl } from '../constants/api'
import { adminFetch } from '../features/admin/adminApi'
import { readApiErrorMessage } from '../utils/apiErrors'
import { useFocusTrap } from '../hooks/useFocusTrap'
import './leads.css'

/* ══════════════════════════════════════════════════════════
   SCORING ENGINE (ключи — значения из RU/EN форм)
   ══════════════════════════════════════════════════════════ */

const TIMELINE_SCORES = {
  'Срочно (до 2 недель)': 35,
  'Срочно (1–2 недели)': 35,
  'В течение месяца': 22,
  '1–3 месяца': 12,
  'Пока изучаем варианты': 4,
  'Urgent (1–2 weeks)': 35,
  'Within a month': 22,
  '1–3 months': 12,
  'Just exploring': 4,
}
function getBudgetScore(budgetStr) {
  if (!budgetStr) return 0
  const v = parseInt(String(budgetStr).replace(/[^0-9]/g, ''), 10)
  if (isNaN(v) || v === 0) return 0
  if (v >= 20000) return 25
  if (v >= 15000) return 20
  if (v >= 10000) return 15
  if (v >= 5000) return 10
  return 3
}
const TASK_VOLUME_SCORES = {
  'Масштабный (10+ процессов)': 15,
  'Средний (3–10 процессов)': 10,
  'Небольшой (1–2 процесса)': 5,
  '500+ заявок/мес.': 15,
  '200–500 заявок/мес.': 10,
  '50–200 заявок/мес.': 10,
  'До 50 заявок/мес.': 5,
  'Up to 50 leads/mo.': 5,
  '50–200 leads/mo.': 10,
  '200–500 leads/mo.': 10,
  '500+ leads/mo.': 15,
}
const COMPANY_SIZE_SCORES = {
  '200+ человек': 10,
  '51–200 человек': 8,
  '21–50 человек': 5,
  '11–50 человек': 5,
  '6–20 человек': 5,
  '1–10 человек': 2,
  '1–5 человек': 2,
  '200+ people': 10,
  '51–200 people': 8,
  '21–50 people': 5,
  '6–20 people': 5,
  '1–5 people': 2,
}
const ROLE_SCORES = {
  'Владелец / CEO': 10,
  'Руководитель отдела': 7,
  'Менеджер / Специалист': 4,
  'Другое': 1,
  'Собственник / CEO': 10,
  'Owner / CEO': 10,
  'Department Head': 7,
  'Employee': 4,
  'Сотрудник': 4,
  'Consultant': 4,
  'Консультант': 4,
}

const FACTOR_KEYS = {
  timeline: 'Сроки',
  budget: 'Бюджет',
  task_volume: 'Объём задачи',
  company_size: 'Размер компании',
  role: 'Роль',
  comment: 'Комментарий',
  email: 'Email указан',
}

function scoreLead(lead, fl) {
  const factors = []
  let raw = 0
  const L = (ruKey) => fl[ruKey] || ruKey

  const add = (ruLabel, key, map) => {
    const pts = map[lead[key]] ?? 0
    if (pts > 0) { raw += pts; factors.push({ label: L(ruLabel), value: lead[key], pts }) }
  }

  add(FACTOR_KEYS.timeline, 'timeline', TIMELINE_SCORES)

  const bPts = getBudgetScore(lead.budget)
  if (bPts > 0) { raw += bPts; factors.push({ label: L(FACTOR_KEYS.budget), value: lead.budget, pts: bPts }) }

  add(FACTOR_KEYS.task_volume, 'task_volume', TASK_VOLUME_SCORES)
  add(FACTOR_KEYS.company_size, 'company_size', COMPANY_SIZE_SCORES)
  add(FACTOR_KEYS.role, 'role', ROLE_SCORES)

  if (lead.source === 'enquire') raw += 3
  if (lead.comments?.trim()) {
    raw += 2
    factors.push({ label: L(FACTOR_KEYS.comment), value: '✓', pts: 2 })
  }
  if (lead.email) {
    raw += 1
    factors.push({ label: L(FACTOR_KEYS.email), value: '✓', pts: 1 })
  }

  const score = Math.min(100, raw)
  return { score, factors }
}

function getTemp(score, crm) {
  if (score >= 68) return { id: 'hot', icon: '🔥', label: crm.temp.hot,  cls: 'temp-hot'  }
  if (score >= 42) return { id: 'warm', icon: '♨️', label: crm.temp.warm, cls: 'temp-warm' }
  if (score >= 18) return { id: 'cool', icon: '🌡', label: crm.temp.cool, cls: 'temp-cool' }
  return               { id: 'cold', icon: '❄️', label: crm.temp.cold, cls: 'temp-cold' }
}

const NICHE_DEPT = {
  'FinTech': 'FinTech-команда',
  'E-commerce / Ритейл': 'E-commerce отдел',
  'Медицина и здоровье': 'MedTech отдел',
  'Недвижимость': 'Real Estate отдел',
  'Образование': 'EdTech отдел',
  'Логистика': 'Logistic-отдел',
  'Гостиничный бизнес / HoReCa': 'HoReCa-отдел',
}

const NICHE_DEPT_EN = {
  'FinTech': 'FinTech team',
  'E-commerce / Ритейл': 'E-commerce team',
  'Медицина и здоровье': 'Healthcare team',
  'Недвижимость': 'Real Estate team',
  'Образование': 'EdTech team',
  'Логистика': 'Logistics team',
  'Гостиничный бизнес / HoReCa': 'HoReCa team',
}

function isBigCompany(size) {
  if (!size) return false
  return ['200+ человек', '51–200 человек', '200+ people', '51–200 people'].includes(size)
}

function getRecommendation(lead, score, crm, lang) {
  const t = getTemp(score, crm)
  const big = isBigCompany(lead.company_size)

  const urgency = {
    text: crm.recUrgency[t.id],
    cls: { hot: 'urg-hot', warm: 'urg-warm', cool: 'urg-cool', cold: 'urg-cold' }[t.id],
  }

  const manager = crm.recManager[t.id]

  const dept = big
    ? crm.deptEnterprise
    : (lang === 'en'
        ? (NICHE_DEPT_EN[lead.business_niche] ?? crm.deptGeneral)
        : (NICHE_DEPT[lead.business_niche] ?? crm.deptGeneral))

  return { urgency, manager, dept }
}

/* ══════════════════════════════════════════════════════════
   UI COMPONENTS
   ══════════════════════════════════════════════════════════ */

function TempBadge({ score, crm, size = 'md' }) {
  const t = getTemp(score, crm)
  return (
    <span className={`temp-badge temp-badge--${size} ${t.cls}`}>
      <span className="temp-badge-icon">{t.icon}</span>
      <span className="temp-badge-label">{t.label}</span>
      <span className="temp-badge-score">{score}</span>
    </span>
  )
}

function ScoreBar({ score, crm }) {
  const t = getTemp(score, crm)
  return (
    <div className="score-bar-wrap">
      <div className="score-bar">
        <div className={`score-bar-fill ${t.cls}`} style={{ width: `${score}%` }} />
      </div>
      <span className="score-bar-num">{score}/100</span>
    </div>
  )
}

function LeadModal({ lead, onClose, getAuthHeaders, onRefresh, crm, lang }) {
  const fl = crm.factorLabels
  const { score, factors } = scoreLead(lead, fl)
  const temp = getTemp(score, crm)
  const rec = getRecommendation(lead, score, crm, lang)

  const [adminNotes, setAdminNotes] = useState(lead.admin_notes || '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesMsg, setNotesMsg] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [delPassword, setDelPassword] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState('')

  const overlayRef = useRef(null)
  const panelRef = useRef(null)

  /** Закрытие только при взаимодействии непосредственно с затемнённым фоном (не с панели и не через всплытие). */
  const closeIfBackdropOnly = useCallback(
    ev => {
      if (overlayRef.current && ev.target === overlayRef.current) onClose()
    },
    [onClose]
  )

  const stopOverlayBubble = useCallback(ev => {
    ev.stopPropagation()
  }, [])

  useFocusTrap(true, panelRef)

  useEffect(() => {
    setAdminNotes(lead.admin_notes || '')
    setNotesMsg('')
    setShowDelete(false)
    setDelPassword('')
    setDelErr('')
  }, [lead.id, lead.admin_notes])

  const loc = lang === 'ru' ? 'ru-RU' : 'en-GB'
  const fullName = [lead.first_name, lead.middle_name, lead.last_name].filter(Boolean).join(' ') || '—'
  const createdAt = new Date(lead.created_at).toLocaleString(loc)

  const saveAdminNotes = async () => {
    setNotesSaving(true)
    setNotesMsg('')
    try {
      const r = await adminFetch(apiUrl(`/leads/${lead.id}/admin-notes`), {
        method: 'PATCH',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ admin_notes: adminNotes }),
      })
      if (!r.ok) {
        const t = await r.text()
        throw new Error(t || crm.saveErr)
      }
      setNotesMsg(crm.saved)
      await onRefresh()
    } catch (e) {
      setNotesMsg(e.message || crm.error)
    } finally {
      setNotesSaving(false)
    }
  }

  const confirmDelete = async () => {
    setDelBusy(true)
    setDelErr('')
    const leadPk = typeof lead.id === 'number' && Number.isFinite(lead.id)
      ? lead.id
      : parseInt(String(lead.id ?? ''), 10)
    if (!Number.isFinite(leadPk) || leadPk < 1) {
      setDelErr(crm.deleteErr)
      setDelBusy(false)
      return
    }
    const path = apiUrl(`/leads/${encodeURIComponent(String(leadPk))}/delete`)
    try {
      const r = await adminFetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ password: delPassword }),
      })
      const raw = await r.text()
      if (r.status === 401) {
        setDelErr(crm.deleteNeedRelogin)
        return
      }
      if (r.status === 403) {
        setDelErr(crm.wrongPassword)
        return
      }
      if (r.status === 429) {
        setDelErr(crm.deleteRateLimited)
        return
      }
      if (!r.ok) {
        let msg = raw
        try {
          const j = JSON.parse(raw)
          msg = readApiErrorMessage(j, msg)
        } catch { /* оставляем raw */ }
        throw new Error(msg || crm.deleteErr)
      }
      onClose()
      await onRefresh()
    } catch (e) {
      setDelErr(e.message || crm.error)
    } finally {
      setDelBusy(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      role="presentation"
      onMouseDown={closeIfBackdropOnly}
      onTouchStart={closeIfBackdropOnly}
      onClick={closeIfBackdropOnly}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        onMouseDown={stopOverlayBubble}
        onTouchStart={stopOverlayBubble}
        onClick={stopOverlayBubble}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <TempBadge score={score} crm={crm} size="lg" />
            <div>
              <h2 className="modal-name" id="lead-modal-title">{fullName}</h2>
              <p className="modal-meta">
                {createdAt} · {lead.source === 'enquire' ? crm.sourceFull : crm.sourceQuick}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          <div className={`modal-rec modal-rec--${temp.id}`}>
            <div className="modal-rec-row">
              <span className="modal-rec-icon">⚡</span>
              <div>
                <p className="modal-rec-label">{crm.priority}</p>
                <p className={`modal-rec-urgency ${rec.urgency.cls}`}>{rec.urgency.text}</p>
              </div>
            </div>
            <div className="modal-rec-row">
              <span className="modal-rec-icon">👤</span>
              <div>
                <p className="modal-rec-label">{crm.manager}</p>
                <p className="modal-rec-value">{rec.manager}</p>
              </div>
            </div>
            <div className="modal-rec-row">
              <span className="modal-rec-icon">🏢</span>
              <div>
                <p className="modal-rec-label">{crm.dept}</p>
                <p className="modal-rec-value">{rec.dept}</p>
              </div>
            </div>
          </div>

          <div className="modal-section">
            <h3 className="modal-section-title">{crm.analysisTitle}</h3>
            <ScoreBar score={score} crm={crm} />
            <div className="factors-list">
              {factors.map((f, i) => (
                <div key={i} className="factor-row">
                  <span className="factor-label">{f.label}</span>
                  <span className="factor-value">{f.value}</span>
                  <span className="factor-pts">+{f.pts}</span>
                </div>
              ))}
              {factors.length === 0 && <p className="factors-empty">{crm.factorsEmpty}</p>}
            </div>
          </div>

          <div className="modal-cols">
            <div className="modal-section">
              <h3 className="modal-section-title">{crm.contacts}</h3>
              <div className="modal-field"><span className="mf-label">{crm.mfName}</span><span className="mf-value">{fullName}</span></div>
              <div className="modal-field"><span className="mf-label">{crm.mfPhone}</span><span className="mf-value">{lead.phone}</span></div>
              <div className="modal-field"><span className="mf-label">{crm.mfEmail}</span><span className="mf-value">{lead.email || '—'}</span></div>
              <div className="modal-field"><span className="mf-label">{crm.mfContactPref}</span><span className="mf-value">{lead.contact_preference || '—'}</span></div>
              <div className="modal-field"><span className="mf-label">{crm.mfTime}</span><span className="mf-value">{lead.preferred_time || '—'}</span></div>

              <div className="contact-btns">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="contact-btn contact-btn--phone">{crm.callBtn}</a>
                )}
                {lead.phone && (
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="contact-btn contact-btn--wa">WhatsApp</a>
                )}
                {lead.phone && (
                  <a href={`https://t.me/+${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="contact-btn contact-btn--tg">Telegram</a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="contact-btn contact-btn--email">✉ Email</a>
                )}
              </div>
            </div>

            <div className="modal-section">
              <h3 className="modal-section-title">{crm.business}</h3>
              <div className="modal-field"><span className="mf-label">{crm.mfNiche}</span><span className="mf-value">{lead.business_niche || '—'}</span></div>
              <div className="modal-field"><span className="mf-label">{crm.mfCompany}</span><span className="mf-value">{lead.company_size || '—'}</span></div>
              <div className="modal-field"><span className="mf-label">{crm.mfRole}</span><span className="mf-value">{lead.role || '—'}</span></div>
              <div className="modal-field"><span className="mf-label">{crm.mfVolume}</span><span className="mf-value">{lead.task_volume || '—'}</span></div>
            </div>

            <div className="modal-section">
              <h3 className="modal-section-title">{crm.task}</h3>
              <div className="modal-field"><span className="mf-label">{crm.mfBudget}</span><span className="mf-value">{lead.budget || '—'}</span></div>
              <div className="modal-field"><span className="mf-label">{crm.mfTimeline}</span><span className="mf-value">{lead.timeline || '—'}</span></div>
              <div className="modal-field"><span className="mf-label">{crm.mfTaskType}</span><span className="mf-value">{lead.task_type || '—'}</span></div>
              <div className="modal-field"><span className="mf-label">{crm.mfProduct}</span><span className="mf-value">{lead.interested_product || '—'}</span></div>
            </div>
          </div>

          <div className="modal-section">
            <h3 className="modal-section-title">{crm.privacyTitle}</h3>
            <div className="modal-field">
              <span className="mf-label">{crm.privacyStatus}</span>
              <span className="mf-value">{lead.privacy_consent ? crm.privacyYes : crm.privacyNo}</span>
            </div>
            {lead.privacy_consent && lead.privacy_consent_at && (
              <div className="modal-field">
                <span className="mf-label">{crm.privacyAt}</span>
                <span className="mf-value">{new Date(lead.privacy_consent_at).toLocaleString(loc)}</span>
              </div>
            )}
          </div>

          {(lead.business_info || lead.comments) && (
            <div className="modal-section">
              <h3 className="modal-section-title">{crm.clientComments}</h3>
              {lead.business_info && (
                <div className="modal-text-block">
                  <p className="modal-text-label">{crm.aboutBiz}</p>
                  <p className="modal-text">{lead.business_info}</p>
                </div>
              )}
              {lead.comments && (
                <div className="modal-text-block">
                  <p className="modal-text-label">{crm.comment}</p>
                  <p className="modal-text">{lead.comments}</p>
                </div>
              )}
            </div>
          )}

          <div className="modal-section modal-section--admin">
            <h3 className="modal-section-title">{crm.adminComment}</h3>
            <p className="modal-hint">{crm.adminCommentHint}</p>
            <textarea
              className="modal-admin-notes"
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder={crm.adminCommentPh}
              rows={4}
            />
            <div className="modal-admin-actions">
              <button type="button" className="btn-save-notes" onClick={saveAdminNotes} disabled={notesSaving}>
                {notesSaving ? crm.saving : crm.save}
              </button>
              {notesMsg && (
                <span className={`notes-msg ${notesMsg === crm.saved ? 'notes-msg--ok' : 'notes-msg--err'}`}>{notesMsg}</span>
              )}
            </div>
          </div>

          <div className="modal-section modal-section--danger">
            <h3 className="modal-section-title">{crm.deleteSection}</h3>
            {!showDelete ? (
              <button type="button" className="btn-delete-lead" onClick={() => setShowDelete(true)}>
                {crm.deleteBtn}
              </button>
            ) : (
              <div className="delete-confirm-box">
                <p className="modal-hint">
                  {crm.deleteHint} <strong>{crm.deleteHintStrong}</strong>{crm.deleteHintEnd}
                </p>
                <input
                  type="password"
                  name={`lead-delete-${lead.id}`}
                  className="field-input delete-password-input"
                  value={delPassword}
                  onChange={e => setDelPassword(e.target.value)}
                  placeholder={crm.passwordPh}
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                />
                {delErr && <p className="delete-err">{delErr}</p>}
                <div className="delete-btns">
                  <button type="button" className="btn-cancel" onClick={() => { setShowDelete(false); setDelPassword(''); setDelErr('') }}>{crm.cancel}</button>
                  <button
                    type="button"
                    className="btn-delete-confirm"
                    disabled={delBusy || !delPassword.trim()}
                    onClick={e => {
                      e.stopPropagation()
                      confirmDelete()
                    }}
                  >
                    {delBusy ? crm.deleting : crm.deleteForever}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, cls, footnote }) {
  return (
    <div className={`stat-card ${cls || ''}`}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
        {footnote && <div className="stat-card-footnote">{footnote}</div>}
        {sub && <div className="stat-card-sub">{sub}</div>}
      </div>
    </div>
  )
}

export default function LeadsDashboard({ getAuthHeaders }) {
  const { lang, ta } = useLang()
  const crm = ta.crm

  const [leads, setLeads] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [weekCount, setWeekCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 50
  const [sourceFilter, setSourceFilter] = useState('')
  const [langFilter, setLangFilter] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(0)
  }, [sourceFilter, langFilter, debouncedSearch])

  const refreshLeads = useCallback(() => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    params.set('skip', String(page * pageSize))
    params.set('limit', String(pageSize))
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (sourceFilter) params.set('source', sourceFilter)
    if (langFilter) params.set('language', langFilter)
    const listUrl = `${apiUrl('/leads/')}?${params.toString()}`
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const weekParams = new URLSearchParams({ skip: '0', limit: '1', created_from: weekAgo })

    return Promise.all([
      adminFetch(listUrl, { credentials: 'include', headers: getAuthHeaders() }).then(async r => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      }),
      adminFetch(`${apiUrl('/leads/')}?${weekParams}`, { credentials: 'include', headers: getAuthHeaders() }).then(async r => {
        if (!r.ok) return { total: 0 }
        return r.json()
      }),
    ])
      .then(([data, weekData]) => {
        setLeads(Array.isArray(data.items) ? data.items : [])
        setTotalCount(Number(data.total) || 0)
        setWeekCount(Number(weekData.total) || 0)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message || String(e))
        setLoading(false)
      })
  }, [getAuthHeaders, page, pageSize, debouncedSearch, sourceFilter, langFilter])

  useEffect(() => {
    refreshLeads()
  }, [refreshLeads])

  const fl = crm.factorLabels
  const scored = useMemo(() =>
    leads
      .map(l => {
        const { score, factors } = scoreLead(l, fl)
        return { ...l, score, factors, temp: getTemp(score, crm) }
      })
      .sort((a, b) => b.score - a.score),
    [leads, crm, fl]
  )

  const filtered = useMemo(() => {
    let res = scored
    if (filter !== 'all') res = res.filter(l => l.temp.id === filter)
    return res
  }, [scored, filter])

  const counts = useMemo(() => {
    const c = { hot: 0, warm: 0, cool: 0, cold: 0 }
    scored.forEach(l => { c[l.temp.id]++ })
    return c
  }, [scored])

  const selectedLead = selectedId != null ? scored.find(l => l.id === selectedId) : null

  const fullName = l =>
    [l.first_name, l.last_name].filter(Boolean).join(' ') || l.phone

  const loc = lang === 'ru' ? 'ru-RU' : 'en-GB'
  const fmt = dt => new Date(dt).toLocaleDateString(loc, { day: '2-digit', month: '2-digit', year: '2-digit' })

  if (loading) return <div className="leads-loading"><div className="spinner" /></div>
  if (error)   return <div className="leads-error">{crm.loadErr} {error}</div>

  const urgent = lead => lead.timeline?.includes('Срочно') || lead.timeline?.includes('Urgent')

  return (
    <div className="leads-dash">

      <div className="stats-grid">
        <StatCard icon="📋" label={crm.stats.total} value={totalCount} sub={crm.stats.perWeek(weekCount)} />
        <StatCard icon="🔥" label={crm.stats.hot} value={counts.hot} cls="sc-hot" footnote={crm.stats.pageScope} />
        <StatCard icon="♨️" label={crm.stats.warm} value={counts.warm} cls="sc-warm" footnote={crm.stats.pageScope} />
        <StatCard icon="🌡" label={crm.stats.cool} value={counts.cool} cls="sc-cool" footnote={crm.stats.pageScope} />
        <StatCard icon="❄️" label={crm.stats.cold} value={counts.cold} cls="sc-cold" footnote={crm.stats.pageScope} />
      </div>

      <div className="leads-toolbar">
        <div className="leads-filter-tabs">
          {[
            { id: 'all', label: crm.filters.all(totalCount) },
            { id: 'hot', label: crm.filters.hot(counts.hot) },
            { id: 'warm', label: crm.filters.warm(counts.warm) },
            { id: 'cool', label: crm.filters.cool(counts.cool) },
            { id: 'cold', label: crm.filters.cold(counts.cold) },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`filter-tab ${filter === tab.id ? 'filter-tab--active' : ''}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="leads-api-filters">
          <label className="leads-api-filters-label">
            <span>{crm.filterSource}</span>
            <select
              className="leads-api-filters-select"
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
            >
              <option value="">{crm.sourceAll}</option>
              <option value="quick">{crm.sourceQuick}</option>
              <option value="enquire">{crm.sourceFull}</option>
            </select>
          </label>
          <label className="leads-api-filters-label">
            <span>{crm.filterLang}</span>
            <select
              className="leads-api-filters-select"
              value={langFilter}
              onChange={e => setLangFilter(e.target.value)}
            >
              <option value="">{crm.langAll}</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </label>
        </div>
        <input
          className="field-input leads-search"
          placeholder={crm.searchPh}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="leads-pagination-bar">
        <button
          type="button"
          className="leads-page-btn"
          disabled={page <= 0}
          onClick={() => setPage(p => Math.max(0, p - 1))}
        >
          {crm.pagePrev}
        </button>
        <span className="leads-page-summary">
          {crm.pageSummary(
            totalCount === 0 ? 0 : page * pageSize + 1,
            Math.min((page + 1) * pageSize, totalCount),
            totalCount,
          )}
        </span>
        <button
          type="button"
          className="leads-page-btn"
          disabled={(page + 1) * pageSize >= totalCount}
          onClick={() => setPage(p => p + 1)}
        >
          {crm.pageNext}
        </button>
      </div>

      <div className="leads-table-wrap">
        {filtered.length === 0 ? (
          <div className="leads-empty">{crm.empty}</div>
        ) : (
          <table className="leads-table">
            <thead>
              <tr>
                <th className="lt-th">{crm.thTemp}</th>
                <th className="lt-th">{crm.thClient}</th>
                <th className="lt-th">{crm.thBiz}</th>
                <th className="lt-th">{crm.thBudget}</th>
                <th className="lt-th">{crm.thTime}</th>
                <th className="lt-th">{crm.thDate}</th>
                <th className="lt-th">{crm.thContact}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr
                  key={lead.id}
                  className={`lt-row lt-row--${lead.temp.id}`}
                  onClick={() => setSelectedId(lead.id)}
                >
                  <td className="lt-td">
                    <TempBadge score={lead.score} crm={crm} size="sm" />
                  </td>
                  <td className="lt-td">
                    <div className="lt-name">{fullName(lead)}</div>
                    <div className="lt-phone">{lead.phone}</div>
                  </td>
                  <td className="lt-td">
                    <div className="lt-niche">{lead.business_niche || '—'}</div>
                    <div className="lt-size">{lead.company_size || '—'}</div>
                  </td>
                  <td className="lt-td">
                    <span className="lt-budget">{lead.budget || '—'}</span>
                  </td>
                  <td className="lt-td">
                    <span className={`lt-timeline ${urgent(lead) ? 'lt-timeline--urgent' : ''}`}>
                      {lead.timeline || '—'}
                    </span>
                  </td>
                  <td className="lt-td lt-date">{fmt(lead.created_at)}</td>
                  <td className="lt-td" onClick={e => e.stopPropagation()}>
                    <div className="lt-actions">
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="lt-btn lt-btn--phone" title={crm.callTitle}>📞</a>
                      )}
                      {lead.phone && (
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="lt-btn lt-btn--wa" title="WhatsApp">WA</a>
                      )}
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="lt-btn lt-btn--email" title={crm.emailTitle}>✉</a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedId(null)}
          getAuthHeaders={getAuthHeaders}
          onRefresh={refreshLeads}
          crm={crm}
          lang={lang}
        />
      )}
    </div>
  )
}
