/**
 * Generates static HTML shells with correct title/description/canonical,
 * hreflang alternates and content-language for crawlers (no full SSR).
 * Runs from npm prebuild. Output: en/ and ru/ under frontend-src root.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SITE_ORIGIN = 'https://autobizlab.store'

/** Должны совпадать с frontend-src/src/i18n (краткое дублирование для сборки без импорта). */
const PAGES = [
  {
    relDir: path.join('en'),
    lang: 'en',
    pathname: '/en',
    title: 'AutoBizLab — AI automation for business in the UAE & MENA',
    description:
      'AI agents and process automation in 7–14 days. Leads, CRM, messengers — without long custom development.',
  },
  {
    relDir: path.join('ru'),
    lang: 'ru',
    pathname: '/ru',
    title: 'AutoBizLab — AI-автоматизация для бизнеса в ОАЭ и MENA',
    description:
      'AI-агенты и автоматизация процессов за 7–14 дней. Заявки, CRM, мессенджеры — без долгой кастомной разработки.',
  },
  {
    relDir: path.join('en', 'enquire'),
    lang: 'en',
    pathname: '/en/enquire',
    title: 'Request a business audit — AutoBizLab',
    description:
      'Tell us about your business and get a tailored AI automation plan. Niche, task, budget and contact details in one form.',
  },
  {
    relDir: path.join('ru', 'enquire'),
    lang: 'ru',
    pathname: '/ru/enquire',
    title: 'Заявка на аудит — AutoBizLab',
    description:
      'Расскажите о бизнесе и получите план внедрения AI: ниша, задача, бюджет и контакты в одной форме.',
  },
  {
    relDir: path.join('en', 'privacy'),
    lang: 'en',
    pathname: '/en/privacy',
    title: 'Privacy Policy — AutoBizLab',
    description:
      'How AutoBizLab processes personal data: purposes, retention, contacts. Business Centre, SPC Free Zone, Sharjah, UAE.',
  },
  {
    relDir: path.join('ru', 'privacy'),
    lang: 'ru',
    pathname: '/ru/privacy',
    title: 'Политика конфиденциальности — AutoBizLab',
    description:
      'Как AutoBizLab обрабатывает персональные данные: цели, сроки хранения, контакты. Business Centre, SPC Free Zone, Sharjah, UAE.',
  },
]

function escapeText(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s) {
  return escapeText(s).replace(/"/g, '&quot;')
}

function hreflangAndLangMeta(pathname, lang) {
  const origin = SITE_ORIGIN.replace(/\/$/, '')
  let enPath
  let ruPath
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    enPath = pathname
    ruPath = pathname === '/en' ? '/ru' : `/ru${pathname.slice(3)}`
  } else if (pathname === '/ru' || pathname.startsWith('/ru/')) {
    ruPath = pathname
    enPath = pathname === '/ru' ? '/en' : `/en${pathname.slice(3)}`
  } else {
    enPath = '/en'
    ruPath = '/ru'
  }
  return [
    `<link rel="alternate" hreflang="en" href="${escapeAttr(origin + enPath)}" />`,
    `<link rel="alternate" hreflang="ru" href="${escapeAttr(origin + ruPath)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeAttr(origin + ruPath)}" />`,
    `<meta http-equiv="content-language" content="${escapeAttr(lang)}" />`,
  ].join('\n    ')
}

function buildHtml(baseTpl, { lang, title, description, pathname }) {
  const canonical = `${SITE_ORIGIN.replace(/\/$/, '')}${pathname}`
  let html = baseTpl
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeText(title)}</title>`)
  html = html.replace(
    /<meta name="description"[\s\S]*?>/,
    `<meta name="description" content="${escapeAttr(description)}" />`,
  )
  const inject = `\n    <link rel="canonical" href="${escapeAttr(canonical)}" />\n    ${hreflangAndLangMeta(pathname, lang)}`
  html = html.replace('</head>', `${inject}\n  </head>`)
  return html
}

const baseTplPath = path.join(ROOT, 'index.html')
const baseTpl = fs.readFileSync(baseTplPath, 'utf8')

for (const loc of ['en', 'ru']) {
  fs.rmSync(path.join(ROOT, loc), { recursive: true, force: true })
}

for (const page of PAGES) {
  const dir = path.join(ROOT, page.relDir)
  fs.mkdirSync(dir, { recursive: true })
  const html = buildHtml(baseTpl, page)
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8')
}

console.log(`write-shell-pages: wrote ${PAGES.length} shells under en/ and ru/`)
