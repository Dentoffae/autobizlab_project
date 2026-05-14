import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import AnimatedBg from '../../components/AnimatedBg'
import Toast from './Toast'

const LeadsDashboard = lazy(() => import('../../pages/LeadsDashboard'))
import { useLang } from '../../context/LangContext'
import { adminLoginPathForLang, homePathForLang } from '../../utils/localePaths'
import { readApiErrorMessage } from '../../utils/apiErrors'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { apiUrl, authHeaders, withCreds, adminFetch } from './adminApi'
import { ADMIN_SETTINGS_LIST_SECTION_ORDER } from '../../i18n/admin'
import '../../pages/admin.css'

/* ── Helpers ───────────────────────────────────────────────────────── */
function parseValue(raw) {
  try { return JSON.parse(raw) } catch { return raw }
}

/* ── CRUD Table Editor ─────────────────────────────────────────────── */
function ListEditor({ settingKey, initialItems, onSave, saving }) {
  const { ta } = useLang()
  const C = ta.crud
  /* initialItems может быть array (старый формат RU-only) или {ru:[],en:[]} */
  const normalize = items => {
    if (Array.isArray(items)) return { ru: items, en: [] }
    return { ru: Array.isArray(items?.ru) ? items.ru : [], en: Array.isArray(items?.en) ? items.en : [] }
  }
  const [rowLang, setRowLang] = useState('ru')
  const [biData, setBiData]     = useState(() => normalize(initialItems))
  const makeRows = items => items.map((text, i) => ({ id: i, text, status: 'saved' }))
  const [rows, setRows]         = useState(() => makeRows(normalize(initialItems).ru))
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [newText, setNewText]   = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const nextId = useRef(normalize(initialItems).ru.length)
  const addInputRef = useRef(null)

  /* При переключении языка — сначала сохраняем текущие строки в biData, затем загружаем другой язык */
  const switchLang = newLang => {
    if (newLang === rowLang) return
    const saved = rows.map(r => r.text)
    const updated = { ...biData, [rowLang]: saved }
    setBiData(updated)
    setRowLang(newLang)
    const otherRows = makeRows(updated[newLang])
    setRows(otherRows)
    setEditingId(null); setSelectedId(null); setNewText('')
    nextId.current = otherRows.length
  }

  const countByStatus = s => rows.filter(r => r.status === s).length
  const norm = normalize(initialItems)
  const hasChanges = rows.some(r => r.status !== 'saved') ||
    rows.map(r => r.text).join('\n') !== (norm[rowLang] || []).join('\n')

  const startEdit = (row, e) => {
    e?.stopPropagation()
    setEditingId(row.id)
    setEditValue(row.text)
  }

  const commitEdit = () => {
    const v = editValue.trim()
    if (v) {
      setRows(rs => rs.map(r =>
        r.id === editingId
          ? { ...r, text: v, status: r.status === 'new' ? 'new' : 'edited' }
          : r
      ))
    }
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  const deleteRow = (id, e) => {
    e?.stopPropagation()
    setRows(rs => rs.filter(r => r.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const moveRow = (idx, dir, e) => {
    e?.stopPropagation()
    const arr = [...rows]
    const to = idx + dir
    if (to < 0 || to >= arr.length) return
    ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
    setRows(arr)
  }

  const addRow = () => {
    const v = newText.trim()
    if (!v) { addInputRef.current?.focus(); return }
    if (rows.some(r => r.text === v)) { addInputRef.current?.select(); return }
    const id = nextId.current++
    setRows(rs => [...rs, { id, text: v, status: 'new' }])
    setNewText('')
    addInputRef.current?.focus()
  }

  const discardChanges = () => {
    const original = normalize(initialItems)[rowLang] || []
    setRows(makeRows(original))
    setEditingId(null); setSelectedId(null); setNewText('')
    nextId.current = original.length
  }

  return (
    <div className="crud-layout">

      {/* ── Переключатель языка ── */}
      <div className="list-lang-bar">
        <button className={`form-lang-tab ${rowLang === 'ru' ? 'active' : ''}`} onClick={() => switchLang('ru')}>🇷🇺 RU</button>
        <button className={`form-lang-tab ${rowLang === 'en' ? 'active' : ''}`} onClick={() => switchLang('en')}>🇬🇧 EN</button>
        <span className="list-lang-hint">{C.editing} {rowLang === 'ru' ? C.langRu : C.langEn}</span>
      </div>

      {/* ── Таблица ── */}
      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th className="crud-th crud-th--num">{C.thNum}</th>
              <th className="crud-th">{C.thName}</th>
              <th className="crud-th crud-th--act">{C.thAct}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                className={[
                  'crud-row',
                  `crud-row--${row.status}`,
                  selectedId === row.id ? 'crud-row--selected' : '',
                ].join(' ')}
                onClick={() => setSelectedId(row.id)}
              >
                <td className="crud-td crud-td--num">{idx + 1}</td>

                <td className="crud-td crud-td--name" onDoubleClick={e => startEdit(row, e)}>
                  {editingId === row.id ? (
                    <input
                      autoFocus
                      className="crud-inline-input"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  commitEdit()
                        if (e.key === 'Escape') cancelEdit()
                        e.stopPropagation()
                      }}
                    />
                  ) : (
                    <span className="crud-cell-text">{row.text}</span>
                  )}
                  {row.status !== 'saved' && (
                    <span className={`crud-badge crud-badge--${row.status}`}>
                      {row.status === 'new' ? C.badgeNew : C.badgeEdited}
                    </span>
                  )}
                </td>

                <td className="crud-td crud-td--act" onClick={e => e.stopPropagation()}>
                  <button className="crud-btn" title={C.editTitle} onClick={e => startEdit(row, e)}>✏</button>
                  <button className="crud-btn" title={C.moveUp}         onClick={e => moveRow(idx, -1, e)} disabled={idx === 0}>↑</button>
                  <button className="crud-btn" title={C.moveDown}          onClick={e => moveRow(idx, +1, e)} disabled={idx === rows.length - 1}>↓</button>
                  <button className="crud-btn crud-btn--danger" title={C.deleteTitle} onClick={e => deleteRow(row.id, e)}>✕</button>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="crud-empty-row">
                  {C.emptyList}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Панель инструментов ── */}
      <aside className="crud-toolbar">
        <p className="crud-toolbar-title">{C.toolbarTitle}</p>

        <div className="crud-toolbar-section">
          <p className="crud-toolbar-label">{C.addLabel}</p>
          <input
            ref={addInputRef}
            className="field-input crud-add-input"
            placeholder={C.addPlaceholder}
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRow()}
          />
          <button className="crud-toolbar-action crud-toolbar-action--primary" onClick={addRow}>
            {C.addRow}
          </button>
        </div>

        <div className="crud-toolbar-sep" />

        <div className="crud-toolbar-section">
          <p className="crud-toolbar-label">{C.statsLabel}</p>
          <div className="crud-stats">
            <div className="crud-stat">
              <span className="crud-stat-num">{rows.length}</span>
              <span className="crud-stat-label">{C.statTotal}</span>
            </div>
            <div className="crud-stat">
              <span className="crud-stat-num crud-stat-num--new">{countByStatus('new')}</span>
              <span className="crud-stat-label">{C.statNew}</span>
            </div>
            <div className="crud-stat">
              <span className="crud-stat-num crud-stat-num--edited">{countByStatus('edited')}</span>
              <span className="crud-stat-label">{C.statEdited}</span>
            </div>
          </div>
        </div>

        <div className="crud-toolbar-sep" />

        <div className="crud-toolbar-section">
          <p className="crud-toolbar-label">{C.manageLabel}</p>
          <button
            className="crud-toolbar-action crud-toolbar-action--save"
            onClick={() => {
              const updatedBi = { ...biData, [rowLang]: rows.map(r => r.text) }
              setBiData(updatedBi)
              onSave(settingKey, updatedBi)
            }}
            disabled={saving === settingKey || !hasChanges}
          >
            {saving === settingKey ? C.saving : C.saveDb}
          </button>
          <button
            className="crud-toolbar-action crud-toolbar-action--discard"
            onClick={discardChanges}
            disabled={!hasChanges}
          >
            {C.discard}
          </button>
        </div>

        {hasChanges && (
          <p className="crud-unsaved-hint">{C.unsaved}</p>
        )}
      </aside>
    </div>
  )
}

/* ── Image Upload Field ────────────────────────────────────────────── */
function ImageUploadField({ value, onChange }) {
  const { ta } = useLang()
  const I = ta.imgUpload
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const fileRef = useRef(null)

  const handleFile = async e => {
    const file = e.target.files[0]
    if (!file) return
    setError(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await adminFetch(apiUrl('/portfolio/upload-image'), withCreds({
        method: 'POST',
        body: fd,
      }))
      const body = await r.json().catch(() => ({}))
      if (!r.ok) {
        throw new Error(readApiErrorMessage(body, 'Error'))
      }
      const { url } = body
      onChange(url)
    } catch (err) {
      setError(err.message || 'Upload error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="img-upload-wrap">
      {value && (
        <div className="img-upload-preview">
          <img src={value} alt="preview" className="img-upload-thumb" />
          <button
            type="button"
            className="img-upload-remove"
            onClick={() => onChange('')}
            title={I.removeTitle}
          >✕</button>
        </div>
      )}

      <div className="img-upload-controls">
        <button
          type="button"
          className="img-upload-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? I.uploading : I.upload}
        </button>
        <span className="img-upload-or">{I.orUrl}</span>
        <input
          type="text"
          className="field-input img-upload-url"
          placeholder="https://..."
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>

      {error && <p className="img-upload-error">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  )
}

/* ── Portfolio CRUD Editor ─────────────────────────────────────────── */

/* Языкозависимые поля: key = RU-ключ, enKey = EN-ключ, labelKey = ключ в ta.portfolio */
const LANDING_LANG_FIELDS = [
  { key: 'title',       enKey: 'title_en',       labelKey: 'title',       type: 'text', required: true },
  { key: 'category',    enKey: 'category_en',    labelKey: 'category',    type: 'text' },
  { key: 'description', enKey: 'description_en',  labelKey: 'description', type: 'textarea' },
]
const LANDING_COMMON_FIELDS = [
  { key: 'image_url',  labelKey: 'image', type: 'image' },
  { key: 'link_url',   labelKey: 'link',  type: 'text' },
  { key: 'sort_order', labelKey: 'sort',  type: 'number' },
  { key: 'is_active',  labelKey: 'active', type: 'checkbox' },
]

const CASE_LANG_FIELDS = [
  { key: 'title',         enKey: 'title_en',         labelKey: 'title',         type: 'text',     required: true },
  { key: 'industry',      enKey: 'industry_en',      labelKey: 'industry',      type: 'text' },
  { key: 'description',   enKey: 'description_en',   labelKey: 'description',   type: 'textarea' },
  { key: 'result_label',  enKey: 'result_label_en',  labelKey: 'resultLabel',   type: 'text',     placeholder: 'рост заявок за месяц' },
  { key: 'extra_metrics', enKey: 'extra_metrics_en', labelKey: 'extraMetrics',  type: 'textarea', placeholder: '[{"metric":"-66%","label":"снижение CPL"}]' },
]
const CASE_COMMON_FIELDS = [
  { key: 'result_metric', labelKey: 'resultMetric', type: 'text', placeholder: '+373%' },
  { key: 'is_featured',   labelKey: 'featured',     type: 'checkbox' },
  { key: 'sort_order',    labelKey: 'sort',         type: 'number' },
]

const EMPTY_LANDING = {
  title: '', title_en: '', category: '', category_en: '',
  description: '', description_en: '', image_url: '', link_url: '', sort_order: 0, is_active: true,
}
const EMPTY_CASE = {
  title: '', title_en: '', industry: '', industry_en: '',
  description: '', description_en: '', result_metric: '',
  result_label: '', result_label_en: '', extra_metrics: '', extra_metrics_en: '',
  is_featured: false, sort_order: 0,
}

function PortfolioEditor({ type }) {
  const { ta } = useLang()
  const P = ta.portfolio
  const landL = ta.portfolio.landFields
  const caseL = ta.portfolio.caseFields

  const endpoint = type === 'landings' ? apiUrl('/portfolio/landings') : apiUrl('/portfolio/cases')
  const adminEp  = type === 'landings' ? apiUrl('/portfolio/landings/all') : apiUrl('/portfolio/cases')
  const langFields   = type === 'landings' ? LANDING_LANG_FIELDS : CASE_LANG_FIELDS
  const commonFields = type === 'landings' ? LANDING_COMMON_FIELDS : CASE_COMMON_FIELDS
  const emptyObj     = type === 'landings' ? EMPTY_LANDING : EMPTY_CASE

  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState(emptyObj)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toast,    setToast]    = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [formLang, setFormLang] = useState('ru')
  const portfolioPanelRef = useRef(null)
  useFocusTrap(panelOpen, portfolioPanelRef)

  const showToast = (msg, t = 'ok') => { setToast({ msg, t }); setTimeout(() => setToast(null), 3000) }

  const load = async () => {
    setLoading(true)
    try {
      const url = type === 'landings' ? adminEp : endpoint
      const r = await adminFetch(url, withCreds({ headers: authHeaders() }))
      if (r.ok) setItems(await r.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [type])

  const openAdd = () => { setForm(emptyObj); setEditId(null); setFormLang('ru'); setPanelOpen(true) }
  const openEdit = item => {
    const f = {}
    ;[...langFields, ...langFields.map(fi => ({ ...fi, key: fi.enKey })), ...commonFields].forEach(fi => {
      f[fi.key] = item[fi.key] ?? (fi.type === 'checkbox' ? false : fi.type === 'number' ? 0 : '')
    })
    setForm(f); setEditId(item.id); setFormLang('ru'); setPanelOpen(true)
  }
  const closePanel = () => { setPanelOpen(false); setEditId(null) }

  const handleField = e => {
    const { name, value, type: t, checked } = e.target
    setForm(f => ({ ...f, [name]: t === 'checkbox' ? checked : t === 'number' ? Number(value) : value }))
  }

  const handleSave = async () => {
    if (!form.title?.trim()) { showToast(P.fillTitle, 'err'); return }
    setSaving(true)
    try {
      const method = editId ? 'PUT' : 'POST'
      const url    = editId ? `${endpoint}/${editId}` : endpoint
      const r = await adminFetch(url, withCreds({ method, headers: authHeaders(), body: JSON.stringify(form) }))
      if (r.status === 401) { showToast(P.noAccess, 'err'); setSaving(false); return }
      if (!r.ok) throw new Error()
      showToast(editId ? P.updated : P.added)
      closePanel()
      await load()
    } catch { showToast(P.saveErr, 'err') }
    setSaving(false)
  }

  const handleDelete = async id => {
    if (!confirm(P.confirmDelete)) return
    setDeleting(id)
    try {
      const r = await adminFetch(`${endpoint}/${id}`, withCreds({ method: 'DELETE', headers: authHeaders() }))
      if (!r.ok && r.status !== 204) throw new Error()
      showToast(P.deleted)
      setItems(it => it.filter(i => i.id !== id))
      if (editId === id) closePanel()
    } catch { showToast(P.delErr, 'err') }
    setDeleting(null)
  }

  return (
    <div className="portfolio-editor">
      {toast && (
        <div className={`portfolio-toast portfolio-toast--${toast.t}`}>
          {toast.t === 'ok' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="portfolio-toolbar-top">
        <span className="portfolio-count">{P.records(items.length)}</span>
        <button className="crud-toolbar-action crud-toolbar-action--primary" onClick={openAdd}>
          {P.add}
        </button>
      </div>

      {loading ? (
        <div className="admin-loading" style={{ minHeight: 120 }}><div className="spinner" /></div>
      ) : (
        <div className={`portfolio-layout ${panelOpen ? 'portfolio-layout--open' : ''}`}>
          <div className="portfolio-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th className="crud-th crud-th--num">#</th>
                  <th className="crud-th">{P.thTitle}</th>
                  {type === 'landings' && <th className="crud-th">{P.thCategory}</th>}
                  {type === 'cases'    && <th className="crud-th">{P.thIndustry}</th>}
                  {type === 'cases'    && <th className="crud-th">{P.thMetric}</th>}
                  {type === 'landings' && <th className="crud-th">{P.thActive}</th>}
                  <th className="crud-th crud-th--act">{ta.crud.thAct}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className={`crud-row ${editId === item.id ? 'crud-row--selected' : ''}`}>
                    <td className="crud-td crud-td--num">{i + 1}</td>
                    <td className="crud-td">{item.title}</td>
                    {type === 'landings' && <td className="crud-td">{item.category || '—'}</td>}
                    {type === 'cases'    && <td className="crud-td">{item.industry || '—'}</td>}
                    {type === 'cases'    && (
                      <td className="crud-td">
                        {item.result_metric
                          ? <span style={{ fontWeight: 700, color: 'var(--c-emerald)' }}>{item.result_metric}</span>
                          : '—'}
                      </td>
                    )}
                    {type === 'landings' && (
                      <td className="crud-td">
                        <span className={`crud-badge ${item.is_active ? 'crud-badge--new' : ''}`}>
                          {item.is_active ? P.yes : P.no}
                        </span>
                      </td>
                    )}
                    <td className="crud-td crud-td--act" onClick={e => e.stopPropagation()}>
                      <button className="crud-btn" onClick={() => openEdit(item)}>✏</button>
                      <button
                        className="crud-btn crud-btn--danger"
                        disabled={deleting === item.id}
                        onClick={() => handleDelete(item.id)}
                      >
                        {deleting === item.id ? '…' : '✕'}
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="crud-empty-row">{P.empty}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {panelOpen && (
            <aside
              ref={portfolioPanelRef}
              className="portfolio-form-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="portfolio-form-heading"
            >
              <div className="portfolio-form-panel-header">
                <h3 id="portfolio-form-heading" className="portfolio-form-title">{editId ? P.formEdit : P.formNew}</h3>
                <button type="button" className="portfolio-close-btn" onClick={closePanel} aria-label={P.closeFormAria}>
                  ✕
                </button>
              </div>

              <div className="portfolio-form-body">
                {/* ── Переключатель языка ── */}
                <div className="form-lang-tabs">
                  <button
                    type="button"
                    className={`form-lang-tab ${formLang === 'ru' ? 'active' : ''}`}
                    onClick={() => setFormLang('ru')}
                  >🇷🇺 RU</button>
                  <button
                    type="button"
                    className={`form-lang-tab ${formLang === 'en' ? 'active' : ''}`}
                    onClick={() => setFormLang('en')}
                  >🇬🇧 EN</button>
                </div>

                {/* ── Языкозависимые поля ── */}
                {langFields.map(fi => {
                  const actualKey = formLang === 'ru' ? fi.key : fi.enKey
                  const labelDict = type === 'landings' ? landL : caseL
                  return (
                    <div key={actualKey} className="field-group">
                      <label className="field-label">
                        {labelDict[fi.labelKey]}
                        {fi.required && formLang === 'ru' && <span style={{color:'#DC2626'}}> *</span>}
                      </label>
                      {fi.type === 'textarea' ? (
                        <textarea
                          name={actualKey}
                          className="field-textarea"
                          value={form[actualKey] || ''}
                          onChange={handleField}
                          placeholder={fi.placeholder || (formLang === 'en' ? 'English text...' : '')}
                          rows={3}
                        />
                      ) : (
                        <input
                          name={actualKey}
                          type="text"
                          className="field-input"
                          value={form[actualKey] ?? ''}
                          onChange={handleField}
                          placeholder={fi.placeholder || (formLang === 'en' ? 'English text...' : '')}
                        />
                      )}
                    </div>
                  )
                })}

                {/* ── Общие поля (не зависят от языка) ── */}
                <div className="form-common-sep">{P.commonFields}</div>
                {commonFields.map(fi => (
                  <div key={fi.key} className={`field-group ${fi.type === 'checkbox' ? 'field-group--inline' : ''}`}>
                    {fi.type === 'checkbox' ? (
                      <label className="portfolio-checkbox-label">
                        <input
                          type="checkbox"
                          name={fi.key}
                          checked={!!form[fi.key]}
                          onChange={handleField}
                          className="portfolio-checkbox"
                        />
                        {(type === 'landings' ? landL : caseL)[fi.labelKey]}
                      </label>
                    ) : fi.key === 'image_url' ? (
                      <>
                        <label className="field-label">{(type === 'landings' ? landL : caseL)[fi.labelKey]}</label>
                        <ImageUploadField
                          value={form.image_url || ''}
                          onChange={url => setForm(f => ({ ...f, image_url: url }))}
                        />
                      </>
                    ) : (
                      <>
                        <label className="field-label">{(type === 'landings' ? landL : caseL)[fi.labelKey]}</label>
                        {fi.type === 'textarea' ? (
                          <textarea
                            name={fi.key}
                            className="field-textarea"
                            value={form[fi.key] || ''}
                            onChange={handleField}
                            placeholder={fi.placeholder || ''}
                            rows={3}
                          />
                        ) : (
                          <input
                            name={fi.key}
                            type={fi.type || 'text'}
                            className="field-input"
                            value={form[fi.key] ?? ''}
                            onChange={handleField}
                            placeholder={fi.placeholder || ''}
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="portfolio-form-footer">
                <button
                  className="crud-toolbar-action crud-toolbar-action--save"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {editId ? P.savePanel(saving) : P.addPanel(saving)}
                </button>
                <button className="crud-toolbar-action crud-toolbar-action--discard" onClick={closePanel}>
                  {P.cancel}
                </button>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Budget Slider Editor ──────────────────────────────────────────── */
function SliderEditor({ initial, onSave, saving }) {
  const { ta } = useLang()
  const S = ta.slider
  const [cfg, setCfg] = useState({
    min: initial?.min ?? 1000,
    max: initial?.max ?? 20000,
    step: initial?.step ?? 1000,
    currency: initial?.currency ?? 'AED',
  })
  const [preview, setPreview] = useState(
    Math.round(((initial?.min ?? 1000) + (initial?.max ?? 20000)) / 2)
  )

  const handle = e => {
    const { name, value } = e.target
    setCfg(c => ({ ...c, [name]: name === 'currency' ? value : Number(value) }))
  }

  const pct = ((preview - cfg.min) / (Math.max(cfg.max - cfg.min, 1))) * 100
  const fmt = v => `${cfg.currency} ${Number(v).toLocaleString()}`

  return (
    <div className="slider-editor">
      <div className="slider-cfg-grid">
        <div className="field-group">
          <label className="field-label">{S.min}</label>
          <input name="min" type="number" className="field-input" value={cfg.min} onChange={handle} step={100} />
        </div>
        <div className="field-group">
          <label className="field-label">{S.max}</label>
          <input name="max" type="number" className="field-input" value={cfg.max} onChange={handle} step={100} />
        </div>
        <div className="field-group">
          <label className="field-label">{S.step}</label>
          <input name="step" type="number" className="field-input" value={cfg.step} onChange={handle} step={100} min={100} />
        </div>
        <div className="field-group">
          <label className="field-label">{S.currency}</label>
          <select name="currency" className="field-select" value={cfg.currency} onChange={handle}>
            <option value="USD">USD $</option>
            <option value="AED">AED دج</option>
            <option value="EUR">EUR €</option>
            <option value="RUB">RUB ₽</option>
          </select>
        </div>
      </div>

      <div className="slider-preview">
        <p className="slider-preview-label">{S.preview}</p>
        <div className="slider-value-display">{fmt(preview)}</div>
        <input
          type="range"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={preview}
          onChange={e => setPreview(Number(e.target.value))}
          className="budget-range-input"
          style={{ '--pct': `${pct}%` }}
        />
        <div className="slider-range-labels">
          <span>{fmt(cfg.min)}</span>
          <span>{fmt(cfg.max)}</span>
        </div>
      </div>

      <button
        className="btn-save"
        onClick={() => onSave('budget_slider', cfg)}
        disabled={saving === 'budget_slider'}
      >
        {saving === 'budget_slider' ? S.saving : S.save}
      </button>
    </div>
  )
}

/* ── Main Admin page ───────────────────────────────────────────────── */

function TotpPanel({ setToast, navigate, lang }) {
  const { ta } = useLang()
  const T = ta.panel.totp
  const [enabled, setEnabled] = useState(null)
  const [busy, setBusy] = useState(false)
  const [provision, setProvision] = useState(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [disPass, setDisPass] = useState('')
  const [disCode, setDisCode] = useState('')

  const load = useCallback(() => {
    adminFetch(apiUrl('/auth/totp/status'), withCreds({ headers: authHeaders() }))
      .then(async r => {
        if (r.status === 401) {
          navigate(adminLoginPathForLang(lang), { replace: true })
          return null
        }
        return r.json()
      })
      .then(d => {
        if (d && typeof d.enabled === 'boolean') setEnabled(d.enabled)
      })
      .catch(() => setEnabled(false))
  }, [navigate, lang])

  useEffect(() => { load() }, [load])

  const begin = async () => {
    setBusy(true); setProvision(null); setConfirmCode('')
    try {
      const r = await adminFetch(apiUrl('/auth/totp/begin'), withCreds({ method: 'POST', headers: authHeaders() }))
      if (r.status === 401) {
        navigate(adminLoginPathForLang(lang), { replace: true })
        return
      }
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        const msg = readApiErrorMessage(d, T.err)
        setToast({ message: msg, type: 'err' })
        return
      }
      setProvision({ secret: d.secret, otpauth_url: d.otpauth_url })
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!provision?.secret || !confirmCode.trim()) return
    setBusy(true)
    try {
      const r = await adminFetch(apiUrl('/auth/totp/confirm'), withCreds({
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ secret: provision.secret, code: confirmCode.trim() }),
      }))
      if (r.status === 401) {
        navigate(adminLoginPathForLang(lang), { replace: true })
        return
      }
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setToast({ message: readApiErrorMessage(d, T.err), type: 'err' })
        return
      }
      setProvision(null)
      setConfirmCode('')
      setEnabled(true)
      setToast({ message: T.okOn, type: 'ok' })
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    if (!disPass || !disCode.trim()) return
    setBusy(true)
    try {
      const r = await adminFetch(apiUrl('/auth/totp/disable'), withCreds({
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ password: disPass, totp_code: disCode.trim().replace(/\s+/g, '') }),
      }))
      if (r.status === 401) {
        navigate(adminLoginPathForLang(lang), { replace: true })
        return
      }
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setToast({ message: readApiErrorMessage(d, T.err), type: 'err' })
        return
      }
      setDisPass('')
      setDisCode('')
      setEnabled(false)
      setToast({ message: T.okOff, type: 'ok' })
    } finally {
      setBusy(false)
    }
  }

  if (enabled === null) {
    return <div className="admin-loading"><div className="spinner" /></div>
  }

  return (
    <div className="admin-card card" style={{ padding: '28px' }}>
      <div className="admin-card-header">
        <h2 className="admin-card-title">{T.title}</h2>
        <p className="admin-card-desc">{T.desc}</p>
      </div>
      <p style={{ marginBottom: 16, fontWeight: 600 }}>
        {enabled ? T.statusOn : T.statusOff}
      </p>

      {!enabled && (
        <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
          <button type="button" className="btn-save" disabled={busy} onClick={begin}>
            {busy ? T.busy : T.begin}
          </button>
          {provision && (
            <>
              <div>
                <label className="field-label">{T.secretLabel}</label>
                <input className="field-input" readOnly value={provision.secret} onFocus={e => e.target.select()} />
              </div>
              <div>
                <label className="field-label">{T.uriLabel}</label>
                <input className="field-input" readOnly value={provision.otpauth_url} onFocus={e => e.target.select()} />
              </div>
              <div>
                <label className="field-label">{T.confirmLabel}</label>
                <input
                  className="field-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={confirmCode}
                  onChange={e => setConfirmCode(e.target.value)}
                />
              </div>
              <button type="button" className="btn-save" disabled={busy} onClick={confirm}>
                {T.confirm}
              </button>
            </>
          )}
        </div>
      )}

      {enabled && (
        <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
          <p className="field-label">{T.disableTitle}</p>
          <input
            className="field-input"
            type="password"
            autoComplete="current-password"
            placeholder={T.disablePass}
            value={disPass}
            onChange={e => setDisPass(e.target.value)}
          />
          <input
            className="field-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={T.disableCode}
            value={disCode}
            onChange={e => setDisCode(e.target.value)}
          />
          <button type="button" className="btn-save" disabled={busy} onClick={disable}>
            {T.disableBtn}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const { t, ta, lang } = useLang()
  const navigate = useNavigate()
  const listLabels = ta.panel.listLabels
  const [adminName, setAdminName] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [toast, setToast] = useState(null)
  const [activeSection, setActiveSection] = useState('leads')

  // ── Проверка токена ─────────────────────────────────────────────────
  useEffect(() => {
    adminFetch(apiUrl('/auth/me'), withCreds({ headers: authHeaders() }))
      .then(async r => {
        if (r.status === 401) {
          navigate(adminLoginPathForLang(lang), { replace: true })
          return
        }
        const data = await r.json()
        setAdminName(data.username || '')
        setAuthChecked(true)
      })
      .catch(() => {
        navigate(adminLoginPathForLang(lang), { replace: true })
      })
  }, [navigate, lang])

  // ── Загрузка настроек ───────────────────────────────────────────────
  useEffect(() => {
    if (!authChecked) return
    adminFetch(apiUrl('/admin/settings'), withCreds({ headers: authHeaders() }))
      .then(async r => {
        if (r.status === 401) {
          navigate(adminLoginPathForLang(lang), { replace: true })
          return null
        }
        return r.json()
      })
      .then(data => {
        if (!data || !Array.isArray(data)) {
          setLoading(false)
          return
        }
        const map = {}
        data.forEach(s => { map[s.key] = parseValue(s.value) })
        setSettings(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authChecked, navigate, lang])

  const logout = async () => {
    await fetch(apiUrl('/auth/logout'), withCreds({ method: 'POST', headers: authHeaders() }))
    navigate(adminLoginPathForLang(lang), { replace: true })
  }

  const saveSetting = useCallback(async (key, value) => {
    setSaving(key)
    try {
      const res = await adminFetch(apiUrl('/admin/settings'), withCreds({
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ key, value }),
      }))
      if (res.status === 401) {
        navigate(adminLoginPathForLang(lang), { replace: true })
        return
      }
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setSettings(s => ({ ...s, [key]: parseValue(updated.value) }))
      setToast({ message: ta.panel.savedKey(key), type: 'ok' })
    } catch {
      setToast({ message: ta.panel.saveErr, type: 'err' })
    } finally {
      setSaving(null)
    }
  }, [navigate, lang])

  if (!authChecked) {
    return (
      <>
        <AnimatedBg />
        <div className="admin-loading" style={{ height: '100vh' }}><div className="spinner" /></div>
      </>
    )
  }

  const listSections = ADMIN_SETTINGS_LIST_SECTION_ORDER.filter(
    k => k in listLabels && k in settings
  )

  const navItems = [
    { id: 'security', label: ta.panel.nav.security, group: 'security' },
    { id: 'leads',         label: ta.panel.nav.leads, group: 'crm' },
    { id: '_sep1', label: null },
    { id: 'portfolio_landings', label: ta.panel.nav.landings, group: 'portfolio' },
    { id: 'portfolio_cases',    label: ta.panel.nav.cases,    group: 'portfolio' },
    { id: '_sep2', label: null },
    { id: 'budget_slider', label: ta.panel.nav.slider, group: 'settings' },
    ...listSections.map(k => ({ id: k, label: `📋 ${listLabels[k]}`, group: 'settings' })),
    { id: 'raw', label: ta.panel.nav.raw, group: 'settings' },
  ]

  return (
    <>
      <AnimatedBg />
      <div className="page">
        <Header />

        <div className="admin-page">
          <div className="admin-hero">
            <div className="container">
              <div className="admin-hero-inner">
                <div>
                  <Link to={homePathForLang(lang)} className="back-link">{ta.panel.backSite}</Link>
                  <h1 className="admin-title">{ta.panel.title}</h1>
                  <p className="admin-sub">{ta.panel.sub}</p>
                </div>
                <div className="admin-user-block">
                  <span className="admin-user-name">{ta.panel.userPrefix} {adminName}</span>
                  <button className="admin-logout-btn" onClick={logout}>{ta.panel.logout}</button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="admin-loading"><div className="spinner" /></div>
          ) : (
            <div className="admin-body container">
              <nav className="admin-nav">
                {navItems.map(item =>
                  item.id?.startsWith('_sep')
                    ? <div key={item.id} className="admin-nav-sep" />
                    : (
                      <button
                        key={item.id}
                        className={`admin-nav-item ${activeSection === item.id ? 'active' : ''}`}
                        onClick={() => setActiveSection(item.id)}
                      >
                        {item.label}
                      </button>
                    )
                )}
              </nav>

              <div className="admin-content">

                {activeSection === 'security' && (
                  <TotpPanel setToast={setToast} navigate={navigate} lang={lang} />
                )}

                {activeSection === 'leads' && (
                  <div className="admin-card card" style={{ padding: '28px' }}>
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">{ta.panel.cards.leadsTitle}</h2>
                      <p className="admin-card-desc">
                        {ta.panel.cards.leadsDesc}
                      </p>
                    </div>
                    <Suspense fallback={<div className="admin-loading"><div className="spinner" /></div>}>
                      <LeadsDashboard getAuthHeaders={authHeaders} />
                    </Suspense>
                  </div>
                )}

                {activeSection === 'portfolio_landings' && (
                  <div className="admin-card card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">{ta.panel.cards.landingsTitle}</h2>
                      <p className="admin-card-desc">
                        {ta.panel.cards.landingsDesc}
                      </p>
                    </div>
                    <PortfolioEditor type="landings" />
                  </div>
                )}

                {activeSection === 'portfolio_cases' && (
                  <div className="admin-card card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">{ta.panel.cards.casesTitle}</h2>
                      <p className="admin-card-desc">
                        {ta.panel.cards.casesDesc}
                      </p>
                    </div>
                    <PortfolioEditor type="cases" />
                  </div>
                )}

                {activeSection === 'budget_slider' && (
                  <div className="admin-card card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">{ta.panel.cards.sliderTitle}</h2>
                      <p className="admin-card-desc">
                        {ta.panel.cards.sliderDesc}
                      </p>
                    </div>
                    <SliderEditor
                      initial={settings.budget_slider}
                      onSave={saveSetting}
                      saving={saving}
                    />
                  </div>
                )}

                {listSections.map(key => activeSection === key && (
                  <div key={key} className="admin-card card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">📋 {listLabels[key]}</h2>
                      <p className="admin-card-desc">
                        {ta.panel.cards.listDescPrefix} <code>{key}</code> · {Array.isArray(settings[key]) ? ta.panel.cards.listDescItems(settings[key].length) : ''}
                      </p>
                    </div>
                    <ListEditor
                      settingKey={key}
                      initialItems={Array.isArray(settings[key]) ? settings[key] : []}
                      onSave={saveSetting}
                      saving={saving}
                    />
                  </div>
                ))}

                {activeSection === 'raw' && (
                  <div className="admin-card card">
                    <div className="admin-card-header">
                      <h2 className="admin-card-title">{ta.panel.cards.rawTitle}</h2>
                      <p className="admin-card-desc">{ta.panel.cards.rawDesc}</p>
                    </div>
                    <div className="raw-table">
                      {Object.entries(settings).map(([key, value]) => (
                        <div key={key} className="raw-row">
                          <div className="raw-key">{key}</div>
                          <pre className="raw-value">{JSON.stringify(value, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-logo">{t.nav.logo}</div>
            <div className="footer-copy">{ta.panel.footerAdmin} · {t.footer.copy}</div>
          </div>
        </footer>
      </div>
    </>
  )
}
