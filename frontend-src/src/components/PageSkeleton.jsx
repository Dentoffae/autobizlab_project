import './page-skeleton.css'

/** Лёгкий fallback для Suspense при lazy-loaded чанках. */
export default function PageSkeleton() {
  return (
    <div className="page-skeleton page-skeleton-page" aria-hidden="true">
      <div className="page-skeleton-bar page-skeleton-bar--hero" />
      <div className="page-skeleton-row">
        <div className="page-skeleton-bar page-skeleton-bar--medium" />
        <div className="page-skeleton-bar page-skeleton-bar--medium" />
      </div>
      <div className="page-skeleton-bar page-skeleton-bar--long" />
    </div>
  )
}
