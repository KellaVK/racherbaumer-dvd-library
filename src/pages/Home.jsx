import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useCatalogQuery } from '../hooks/useCatalogQuery'
import CatalogFilters from '../components/dvds/CatalogFilters'
import DVDCard from '../components/DVDCard'
import DVDListRow from '../components/dvds/DVDListRow'

const PAGE_SIZE = 48

export default function Home() {
  const [dvds, setDvds] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE)

  useEffect(() => {
    document.title = 'Jon Racherbaumer Magic DVD Library'
    const q = query(collection(db, 'dvds'), orderBy('title'))
    const unsub = onSnapshot(
      q,
      snap => {
        setDvds(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
        setLoadError(null)
      },
      err => {
        console.error('Firestore snapshot error on DVDs:', err)
        setLoadError('The catalog could not be loaded from the library archive. Please check your connection and reload.')
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  const {
    state,
    results,
    facets,
    activeFilterCount,
    setSearch,
    setFilter,
    removeFilter,
    clearFilters,
    setView,
    setSort,
  } = useCatalogQuery(dvds)

  // Reset pagination limit when search or filters change
  useEffect(() => {
    setVisibleLimit(PAGE_SIZE)
  }, [state.query, state.availability, state.type, state.era, state.letter, state.sort])

  const visibleResults = results.slice(0, visibleLimit)
  const hasMore = visibleLimit < results.length

  return (
    <div className="page-enter" style={{ maxWidth: '80rem', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>

      {/* Hero Header */}
      <div style={{ marginBottom: '2.5rem' }}>
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
          {dvds.length} titles &nbsp;·&nbsp; {facets.availableCount} available to borrow
        </p>
      </div>

      {/* Ornamental rule */}
      <div className="deco-rule" style={{ marginBottom: '2rem' }} />

      {/* Error state */}
      {loadError && (
        <div className="notice notice-danger" style={{ marginBottom: '2rem' }}>
          <strong>Error loading catalog</strong>
          <p style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>{loadError}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary" style={{ marginTop: '0.75rem', fontSize: '0.7rem' }}>
            Reload Page
          </button>
        </div>
      )}

      {/* Catalog Filters & Controls */}
      <CatalogFilters
        state={state}
        facets={facets}
        totalResults={results.length}
        activeFilterCount={activeFilterCount}
        setSearch={setSearch}
        setFilter={setFilter}
        removeFilter={removeFilter}
        clearFilters={clearFilters}
        setView={setView}
        setSort={setSort}
      />

      {/* Results View */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card" style={{ height: '10rem', opacity: 0.4 }}>
              <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ width: '3px', backgroundColor: 'var(--border)' }} />
                <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
          <p style={{ color: 'var(--text-muted)', fontFamily: "'Josefin Sans', sans-serif", fontSize: '0.85rem', letterSpacing: '0.08em' }}>
            No DVDs found matching your search or filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="btn-ghost"
            style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--gold)' }}
          >
            Reset all filters
          </button>
        </div>
      ) : state.view === 'list' ? (
        <div className="catalog-list">
          {visibleResults.map(dvd => (
            <DVDListRow key={dvd.id} dvd={dvd} />
          ))}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
        }}>
          {visibleResults.map(dvd => (
            <DVDCard key={dvd.id} dvd={dvd} />
          ))}
        </div>
      )}

      {/* Progressive Load More button */}
      {!loading && hasMore && (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}>
            Showing {visibleResults.length} of {results.length} titles
          </p>
          <button
            type="button"
            onClick={() => setVisibleLimit(prev => prev + PAGE_SIZE)}
            className="btn-secondary"
            style={{ padding: '0.6rem 2rem', fontSize: '0.75rem' }}
          >
            Load More Titles
          </button>
        </div>
      )}
    </div>
  )
}
