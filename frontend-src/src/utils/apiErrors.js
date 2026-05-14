/**
 * Разбор тел ошибок API после введения единого envelope { error, correlation_id }.
 * Поддерживает и старый формат FastAPI { detail }.
 */
export function readApiErrorMessage(data, fallback = '') {
  if (!data || typeof data !== 'object') return fallback
  const e = data.error
  if (e && typeof e.message === 'string') return e.message
  if (e && typeof e.message === 'object' && e.message !== null) {
    if (typeof e.message.message === 'string') return e.message.message
    return JSON.stringify(e.message)
  }
  const d = data.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d[0]?.msg) return d.map(x => x.msg).join('; ')
  return fallback
}

export function readApiOtpRequired(data) {
  if (!data?.error) return null
  if (data.error.code === 'otp_required') return data.error.message
  return null
}
