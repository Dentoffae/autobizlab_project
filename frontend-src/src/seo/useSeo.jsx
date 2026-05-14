import { useEffect } from 'react'
import { SITE_ORIGIN } from '../constants/siteContact'
import { enquirePathForLang, homePathForLang, privacyPathForLang } from '../utils/localePaths'
import { toAbsoluteOgUrl } from './meta'

/** Ключевая секция SPA: meta / OG / canonical / hreflang при смене маршрута и локали. */
export function useSeo({
  title,
  description,
  pathname,
  lang,
  page,
  ogImage,
  ogType = 'website',
}) {
  useEffect(() => {
    document.title = title

    function byName(metaName, content) {
      let el = document.querySelector(`meta[name="${metaName}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', metaName)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    function byProperty(prop, content) {
      let el = document.querySelector(`meta[property="${prop}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', prop)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    byName('description', description)

    const ogImg = ogImage ?? '/favicon.svg'
    const absImage = toAbsoluteOgUrl(SITE_ORIGIN, ogImg)

    byProperty('og:type', ogType)
    byProperty('og:title', title)
    byProperty('og:description', description)
    byProperty('og:image', absImage)

    /** og:url — канонический URL текущего представления. */
    let ruPath = homePathForLang('ru')
    let enPath = homePathForLang('en')
    if (page === 'landing') {
      ruPath = homePathForLang('ru')
      enPath = homePathForLang('en')
    } else if (page === 'enquire') {
      ruPath = enquirePathForLang('ru')
      enPath = enquirePathForLang('en')
    } else if (page === 'privacy') {
      ruPath = privacyPathForLang('ru')
      enPath = privacyPathForLang('en')
    }

    /** Канонический путь = фактический URL (редирект / → /ru на nginx). */
    const pathForCanonical =
      pathname === '/' || pathname === ''
        ? homePathForLang(lang)
        : pathname.startsWith('/')
          ? pathname
          : `/${pathname}`

    const canonicalHref = SITE_ORIGIN.replace(/\/$/, '') + pathForCanonical

    byProperty('og:url', canonicalHref)

    const localeOg = lang === 'ru' ? 'ru_RU' : 'en_US'
    const altLocaleOg = lang === 'ru' ? 'en_US' : 'ru_RU'
    byProperty('og:locale', localeOg)

    /** Вторая локаль Open Graph. */
    document.querySelectorAll('meta[property="og:locale:alternate"]').forEach(el => el.remove())
    const ogAlt = document.createElement('meta')
    ogAlt.setAttribute('property', 'og:locale:alternate')
    ogAlt.setAttribute('content', altLocaleOg)
    document.head.appendChild(ogAlt)

    byName('twitter:card', 'summary_large_image')
    byName('twitter:title', title)
    byName('twitter:description', description)
    byName('twitter:image', absImage)

    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', canonicalHref)

    document.querySelectorAll('link[data-seo-hreflang]').forEach(n => n.remove())

    function addHreflang(hrefLang, hrefPath) {
      const l = document.createElement('link')
      l.setAttribute('rel', 'alternate')
      l.setAttribute('hreflang', hrefLang)
      l.setAttribute('href', SITE_ORIGIN.replace(/\/$/, '') + hrefPath)
      l.setAttribute('data-seo-hreflang', hrefLang)
      document.head.appendChild(l)
    }

    addHreflang('ru-RU', ruPath)
    addHreflang('en', enPath)
    addHreflang('x-default', homePathForLang('ru'))
  }, [title, description, pathname, lang, page, ogImage, ogType])
}
