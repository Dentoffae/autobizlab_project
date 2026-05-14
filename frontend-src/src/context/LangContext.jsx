import { createContext, useContext, useMemo, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { translations, enquireTranslations, adminTranslations } from '../i18n'
import {
  langFromPathname,
  homePathForLang,
  enquirePathForLang,
  privacyPathForLang,
  isAdminPath,
  isAdminLoginPath,
  adminPathForLang,
  adminLoginPathForLang,
} from '../utils/localePaths'

const LangCtx = createContext()

export function LangProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()

  const lang = useMemo(() => langFromPathname(location.pathname), [location.pathname])

  const setLang = useCallback(
    (newLang) => {
      if (newLang === lang) return
      const { pathname, search, hash } = location

      if (isAdminPath(pathname)) {
        const base = isAdminLoginPath(pathname)
          ? adminLoginPathForLang(newLang)
          : adminPathForLang(newLang)
        navigate(base + search + hash, { replace: true })
        return
      }

      let newPath
      if (pathname.includes('/enquire')) {
        newPath = enquirePathForLang(newLang) + search + hash
      } else if (pathname.includes('/privacy')) {
        newPath = privacyPathForLang(newLang) + search + hash
      } else {
        newPath = homePathForLang(newLang) + search + hash
      }
      navigate(newPath, { replace: true })
    },
    [lang, location, navigate]
  )

  const t = translations[lang]
  const te = enquireTranslations[lang]
  const ta = adminTranslations[lang]

  useEffect(() => {
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'en'
  }, [lang])

  return (
    <LangCtx.Provider value={{ lang, setLang, t, te, ta }}>
      {children}
    </LangCtx.Provider>
  )
}

export const useLang = () => useContext(LangCtx)
