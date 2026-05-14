export type SiteLang = 'ru' | 'en'

/** Язык по префиксу пути (публичная часть + админка). */
export function langFromPathname(pathname: string): SiteLang {
  if (pathname === '/ru' || pathname.startsWith('/ru/')) return 'ru'
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en'
  return 'ru'
}

export function homePathForLang(lang: SiteLang): string {
  return lang === 'ru' ? '/ru' : '/en'
}

export function enquirePathForLang(lang: SiteLang): string {
  return lang === 'ru' ? '/ru/enquire' : '/en/enquire'
}

export function privacyPathForLang(lang: SiteLang): string {
  return lang === 'ru' ? '/ru/privacy' : '/en/privacy'
}

export function adminPathForLang(lang: SiteLang): string {
  return lang === 'ru' ? '/ru/admin' : '/en/admin'
}

export function adminLoginPathForLang(lang: SiteLang): string {
  return lang === 'ru' ? '/ru/admin/login' : '/en/admin/login'
}

export function isAdminLoginPath(pathname: string): boolean {
  return pathname.endsWith('/admin/login')
}

export function isAdminPath(pathname: string): boolean {
  return /\/admin(\/|$)/.test(pathname)
}

export function isLandingPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/ru' || pathname === '/en'
}

export function homeLinkFromLocation(_pathname: string, lang: SiteLang): string {
  return homePathForLang(lang)
}
