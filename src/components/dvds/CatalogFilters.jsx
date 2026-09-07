import { useState } from 'react'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function CatalogFilters({
  state,
  facets,
  totalResults,
  activeFilterCount,
  setSearch,
  setFilter,
  removeFilter,
  clearFilters,
  setView,
  setSort,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div className="catalog-filters-container" style={{ marginBottom: '2rem' }}>
      {/* Search Bar & View Toggle */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <label htmlFor="catalog-search" className="sr-only">Search DVDs</label>
          <svg style={{
            position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
            width: '14px', height: '14px', color: 'var(--text-dim)', pointerEvents: 'none',
          }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="catalog-search"
            type="text"
            value={state.query}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, magician, magic type, contents…"
            className="input"
            style={{ paddingLeft: '2.5rem', paddingRight: state.query ? '2.5rem' : '1rem', fontSize: '0.875rem' }}
          />
          {state.query && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.85rem', lineHeight: 1, padding: '0.25rem',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* View Toggle (Grid vs List) */}
        <div className="view-toggle-group" role="group" aria-label="Layout view">
          <button
            type="button"
            className={`btn-ghost view-toggle-btn ${state.view !== 'list' ? 'active' : ''}`}
            onClick={() => setView('grid')}
            title="Grid view"
            aria-pressed={state.view !== 'list'}
            aria-label="Grid view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            className={`btn-ghost view-toggle-btn ${state.view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
            title="Compact list view"
            aria-pressed={state.view === 'list'}
            aria-label="List view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="4" width="18" height="3" rx="0.5" />
              <rect x="3" y="10.5" width="18" height="3" rx="0.5" />
              <rect x="3" y="17" width="18" height="3" rx="0.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Disclosure Toggle & Alphabet Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          type="button"
          onClick={() => setFiltersOpen(o => !o)}
          aria-expanded={filtersOpen}
          aria-controls="catalog-filter-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.68rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: activeFilterCount > 0 ? 'var(--gold)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.4rem 0',
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
          {activeFilterCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '1.1rem', height: '1.1rem',
              backgroundColor: 'var(--gold)', color: 'var(--ink)',
              fontSize: '0.55rem', fontWeight: 600,
            }}>{activeFilterCount}</span>
          )}
        </button>

        {/* Alphabet quick navigation */}
        <nav className="alphabet-bar" aria-label="Quick alphabet filter">
          <button
            type="button"
            className={`alphabet-link ${state.letter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('letter', 'all')}
          >
            All
          </button>
          {LETTERS.map(letter => (
            <button
              key={letter}
              type="button"
              className={`alphabet-link ${state.letter === letter ? 'active' : ''}`}
              onClick={() => setFilter('letter', state.letter === letter ? 'all' : letter)}
            >
              {letter}
            </button>
          ))}
        </nav>
      </div>

      {/* Collapsible Filter Panel */}
      {filtersOpen && (
        <div id="catalog-filter-panel" className="catalog-filter-panel">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {/* Availability */}
            <div>
              <label htmlFor="filter-avail" className="sr-only">Availability</label>
              <select
                id="filter-avail"
                value={state.availability}
                onChange={e => setFilter('availability', e.target.value)}
                className="input"
                style={{ width: 'auto', fontSize: '0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
              >
                <option value="all">All DVDs</option>
                <option value="available">Available to Borrow ({facets.availableCount})</option>
                <option value="out">Currently Checked Out ({facets.totalCount - facets.availableCount})</option>
              </select>
            </div>

            {/* Magic Type */}
            <div>
              <label htmlFor="filter-type" className="sr-only">Magic Type</label>
              <select
                id="filter-type"
                value={state.type}
                onChange={e => setFilter('type', e.target.value)}
                className="input"
                style={{ width: 'auto', fontSize: '0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
              >
                <option value="all">All Types</option>
                {facets.types.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.value} ({t.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Era */}
            <div>
              <label htmlFor="filter-era" className="sr-only">Decade / Era</label>
              <select
                id="filter-era"
                value={state.era}
                onChange={e => setFilter('era', e.target.value)}
                className="input"
                style={{ width: 'auto', fontSize: '0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
              >
                <option value="all">All Eras</option>
                {facets.eras.map(e => (
                  <option key={e.value} value={e.value}>
                    {e.label} ({e.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="filter-sort" className="sr-only">Sort By</label>
              <select
                id="filter-sort"
                value={state.sort}
                onChange={e => setSort(e.target.value)}
                className="input"
                style={{ width: 'auto', fontSize: '0.75rem', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
              >
                <option value="title">Sort: Title A–Z</option>
                <option value="magician">Sort: Magician A–Z</option>
                <option value="year-new">Sort: Year (Newest)</option>
                <option value="year-old">Sort: Year (Oldest)</option>
              </select>
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn-ghost"
                style={{ fontSize: '0.68rem', padding: '0.4rem 0.75rem', color: 'var(--text-muted)' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
          <span style={{
            fontFamily: "'Josefin Sans', sans-serif",
            fontSize: '0.62rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
          }}>
            Active:
          </span>

          {state.availability !== 'all' && (
            <span className="filter-chip">
              {state.availability === 'available' ? 'Available' : 'Checked out'}
              <button type="button" onClick={() => removeFilter('availability')} aria-label="Remove availability filter">✕</button>
            </span>
          )}

          {state.type !== 'all' && (
            <span className="filter-chip">
              Type: {state.type}
              <button type="button" onClick={() => removeFilter('type')} aria-label="Remove type filter">✕</button>
            </span>
          )}

          {state.era !== 'all' && (
            <span className="filter-chip">
              Era: {state.era}
              <button type="button" onClick={() => removeFilter('era')} aria-label="Remove era filter">✕</button>
            </span>
          )}

          {state.letter !== 'all' && (
            <span className="filter-chip">
              Letter: {state.letter}
              <button type="button" onClick={() => removeFilter('letter')} aria-label="Remove letter filter">✕</button>
            </span>
          )}

          <button
            type="button"
            onClick={clearFilters}
            className="btn-ghost"
            style={{ fontSize: '0.62rem', padding: '0.2rem 0.5rem', color: 'var(--gold)', textTransform: 'uppercase' }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Results count indicator */}
      <div style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '0.68rem',
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        marginTop: '1rem',
      }}>
        {totalResults} title{totalResults !== 1 ? 's' : ''} found
        {state.query && <span style={{ color: 'var(--gold)' }}> · matching “{state.query}”</span>}
        {state.letter !== 'all' && <span style={{ color: 'var(--gold)' }}> · starting with {state.letter}</span>}
      </div>
    </div>
  )
}
