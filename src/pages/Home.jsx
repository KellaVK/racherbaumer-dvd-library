import { useState, useEffect, useMemo } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import Fuse from 'fuse.js'
import { db } from '../firebase/config'
import DVDCard from '../components/DVDCard'

const FUSE_OPTIONS = {
  keys: [
    { name: 'title',     weight: 3 },
    { name: 'magician',  weight: 2 },
    { name: 'notes',     weight: 1 },
    { name: 'magicType', weight: 1.5 },
    { name: 'producer',  weight: 0.5 },
    { name: 'aiSummary', weight: 0.8 },
  ],
  threshold: 0.35,
  includeScore: true,
}

export default function Home() {
  const [dvds, setDvds]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterAvail, setFilterAvail] = useState('all')
  const [sortBy, setSortBy]         = useState('title')
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'dvds'), orderBy('title'))
    return onSnapshot(q, snap => {
      setDvds(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  const allTypes = useMemo(() => {
    const types = new Set()
    dvds.forEach(dvd => {
      const t = Array.isArray(dvd.magicType)
        ? dvd.magicType
        : dvd.magicType?.split(';').map(s => s.trim()) || []
      t.forEach(x => x && types.add(x))
    })
    return Array.from(types).sort()
  }, [dvds])

  const fuse = useMemo(() => new Fuse(dvds, FUSE_OPTIONS), [dvds])

  const results = useMemo(() => {
    let list = search.trim()
      ? fuse.search(search.trim()).map(r => r.item)
      : [...dvds]

    if (filterType !== 'all') {
      list = list.filter(d => {
        const types = Array.isArray(d.magicType)
          ? d.magicType
          : d.magicType?.split(';').map(s => s.trim()) || []
        return types.includes(filterType)
      })
    }

    if (filterAvail === 'available') list = list.filter(d => !d.checkedOutBy)
    if (filterAvail === 'out')       list = list.filter(d => !!d.checkedOutBy)

    if (!search.trim()) {
      list.sort((a, b) => {
        if (sortBy === 'title')    return a.title.localeCompare(b.title)
        if (sortBy === 'magician') {
          const am = Array.isArray(a.magician) ? a.magician[0] : a.magician || ''
          const bm = Array.isArray(b.magician) ? b.magician[0] : b.magician || ''
          return am.localeCompare(bm)
        }
        return 0
      })
    }
    return list
  }, [dvds, search, filterType, filterAvail, sortBy, fuse])

  const availableCount = dvds.filter(d => !d.checkedOutBy).length
  const activeFilters  = (filterType !== 'all' ? 1 : 0) + (filterAvail !== 'all' ? 1 : 0)

  return (
    <div className="page-enter" style={{ maxWidth: '80rem', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>

      {/* Hero */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.65rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: '0.75rem',
          fontWeight: 400,
        }}>
          The Collection
        </p>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(2rem, 5vw, 3.25rem)',
          fontWeight: 500,
          color: 'var(--text)',
          lineHeight: 1.15,
          marginBottom: '0.75rem',
        }}>
          Jon Racherbaumer<br />
          <em style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Magic DVD Library</em>
        </h1>
        <p style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
        }}>
          {dvds.length} titles &nbsp;·&nbsp; {availableCount} available to borrow
        </p>
      </div>

      {/* Ornamental rule */}
      <div className="deco-rule" style={{ marginBottom: '2rem' }} />

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <svg style={{
          position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
          width: '14px', height: '14px', color: 'var(--text-dim)', pointerEvents: 'none',
        }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, magician, type…"
          className="input"
          style={{ paddingLeft: '2.5rem', paddingRight: search ? '2.5rem' : '1rem', fontSize: '0.875rem' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{
            position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.7rem', lineHeight: 1,
          }}>
            ✕
          </button>
        )}
      </div>

      {/* Collapsible filters */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setFiltersOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: activeFilters > 0 ? 'var(--gold)' : 'var(--text-dim)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem 0',
            transition: 'color 0.2s',
          }}
        >
          <span style={{
            display: 'inline-block',
            fontSize: '0.45rem',
            transform: filtersOpen ? 'rotate(90deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
            color: 'var(--gold)',
          }}>▶</span>
          Filters &amp; Sort
          {activeFilters > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '1rem', height: '1rem', borderRadius: 0,
              backgroundColor: 'var(--gold)', color: 'var(--ink)',
              fontSize: '0.55rem', fontWeight: 600,
            }}>{activeFilters}</span>
          )}
        </button>

        {filtersOpen && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginTop: '0.75rem',
            padding: '1rem',
            borderLeft: '2px solid var(--border)',
          }}>
            <select value={filterAvail} onChange={e => setFilterAvail(e.target.value)}
              className="input" style={{ width: 'auto', fontSize: '0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}>
              <option value="all">All DVDs</option>
              <option value="available">Available only</option>
              <option value="out">Checked out</option>
            </select>

            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="input" style={{ width: 'auto', fontSize: '0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}>
              <option value="all">All types</option>
              {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="input" style={{ width: 'auto', fontSize: '0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}>
              <option value="title">Sort: Title A–Z</option>
              <option value="magician">Sort: Magician A–Z</option>
            </select>

            {activeFilters > 0 && (
              <button
                onClick={() => { setFilterType('all'); setFilterAvail('all') }}
                className="btn-ghost"
                style={{ fontSize: '0.65rem', padding: '0.4rem 0.75rem', color: 'var(--text-dim)' }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '0.65rem',
        letterSpacing: '0.1em',
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        marginBottom: '1.25rem',
      }}>
        {results.length} title{results.length !== 1 ? 's' : ''}
        {search && <span style={{ color: 'var(--gold)' }}> · "{search}"</span>}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '10px',
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card" style={{ height: '10rem', opacity: 0.4 }}>
              <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ width: '2px', backgroundColor: 'var(--border)' }} />
                <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ height: '0.875rem', backgroundColor: 'var(--border)', width: '75%', animation: 'pulse 2s infinite' }} />
                  <div style={{ height: '0.625rem', backgroundColor: 'var(--border)', width: '50%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
          <div className="deco-divider"><span>◆</span></div>
          <p style={{ color: 'var(--text-muted)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.8rem', letterSpacing: '0.08em' }}>
            No DVDs found matching your search.
          </p>
          <button onClick={() => { setSearch(''); setFilterType('all'); setFilterAvail('all') }}
            className="btn-ghost" style={{ marginTop: '1rem', fontSize: '0.7rem' }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '10px',
        }}>
          {results.map(dvd => <DVDCard key={dvd.id} dvd={dvd} />)}
        </div>
      )}
    </div>
  )
}
