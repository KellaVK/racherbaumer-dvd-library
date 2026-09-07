import { Link } from 'react-router-dom'
import StatusBadge from '../ui/StatusBadge'

export default function DVDListRow({ dvd }) {
  const isAvailable = !dvd.checkedOutBy
  const magicians = Array.isArray(dvd.magician) ? dvd.magician : [dvd.magician].filter(Boolean)
  const types = Array.isArray(dvd.magicType) ? dvd.magicType : []

  return (
    <article className="catalog-list-row">
      <div className="list-row-main">
        <Link to={`/dvd/${dvd.id}`} className="list-row-title">
          {dvd.title}
        </Link>
        <div className="list-row-meta">
          <span className="list-row-magician">{magicians.join(', ') || '—'}</span>
          {dvd.year && <span className="list-row-detail">· {dvd.year}</span>}
          {dvd.producer && <span className="list-row-detail">· {dvd.producer}</span>}
        </div>
      </div>

      <div className="list-row-tags">
        {types.slice(0, 3).map(t => (
          <span key={t} className="badge-type">{t}</span>
        ))}
      </div>

      <div className="list-row-status">
        <StatusBadge status={isAvailable ? 'available' : 'out'} />
      </div>
    </article>
  )
}
