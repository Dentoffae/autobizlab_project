import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { privacyPathForLang } from '../utils/localePaths'

export default function SiteFooter() {
  const { t, lang } = useLang()
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-logo">{t.nav.logo}</div>
        <div className="footer-links">
          <a href={`tel:${t.footer.phone.replace(/\s/g, '')}`}>{t.footer.phone}</a>
          <a href={`mailto:${t.footer.email}`}>{t.footer.email}</a>
          <span>{t.footer.address}</span>
          <Link to={privacyPathForLang(lang)}>{t.footer.privacy}</Link>
        </div>
        <div className="footer-copy">{t.footer.copy}</div>
      </div>
    </footer>
  )
}
