import { Link, useLocation } from 'react-router-dom'
import AnimatedBg from '../components/AnimatedBg'
import Header from '../components/Header'
import SiteFooter from '../components/SiteFooter'
import { useLang } from '../context/LangContext'
import { homePathForLang } from '../utils/localePaths'
import { useSeo } from '../seo/useSeo'
import './privacy.css'

export default function Privacy() {
  const { t, lang } = useLang()
  const { pathname } = useLocation()
  const pp = t.privacyPage

  useSeo({
    title: pp.docTitle,
    description: pp.metaDescription,
    pathname,
    lang,
    page: 'privacy',
    ogImage: t.seo?.ogImage,
  })

  const home = homePathForLang(lang)

  return (
    <>
      <div className="below-hero-bg">
        <AnimatedBg />
      </div>
      <div className="page privacy-page">
        <Header />
        <main className="privacy-main container">
          <article className="privacy-article card-surface">
            <p className="privacy-updated">{pp.updated}</p>
            <h1 className="privacy-title">{pp.title}</h1>
            <p className="privacy-intro">{pp.intro}</p>
            {pp.sections.map((sec, i) => (
              <section key={i} className="privacy-section">
                <h2>{sec.h}</h2>
                {sec.p.map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </section>
            ))}
            <p className="privacy-back">
              <Link to={home}>{pp.backLink}</Link>
            </p>
          </article>
        </main>
        <SiteFooter />
      </div>
    </>
  )
}
