import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'

interface Deal {
  id: string
  company: string
  formType: string
  filedDate: string
  accessionNo: string
  edgarUrl: string
}

interface DealsResponse {
  deals: Deal[]
  fetchedAt: string | null
  count: number
  message?: string
}

const FORM_LABELS: Record<string, string> = {
  'S-4': 'Merger/Reg.',
  'S-4/A': 'Merger Amend.',
  'F-4': 'Foreign Merger',
  'F-4/A': 'Foreign Merger Amend.',
  'SC TO-T': 'Tender Offer',
  'SC TO-I': 'Issuer Tender',
  'SC 13E-3': 'Going Private',
}

const FORM_COLORS: Record<string, string> = {
  'S-4': '#22d3ee',
  'S-4/A': '#67e8f9',
  'F-4': '#a78bfa',
  'F-4/A': '#c4b5fd',
  'SC TO-T': '#fb923c',
  'SC TO-I': '#fbbf24',
  'SC 13E-3': '#f87171',
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export const Route = createFileRoute('/ticker')({
  head: () => ({
    meta: [{ title: 'EDGAR M&A Deal Tape' }],
  }),
  component: TickerPage,
})

const SPEED = 60 // px/s

function TickerPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const offsetRef = useRef(0)

  async function loadDeals() {
    try {
      const res = await fetch('/api/deals')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: DealsResponse = await res.json()
      setDeals(data.deals ?? [])
      setFetchedAt(data.fetchedAt)
      setError(null)
    } catch {
      setError('Unable to load filings — retrying soon')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeals()
    const interval = setInterval(loadDeals, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track || deals.length === 0) return

    let rafId: number

    function step(ts: number) {
      if (startTimeRef.current === null) startTimeRef.current = ts
      const elapsed = (ts - startTimeRef.current) / 1000
      const halfWidth = track!.scrollWidth / 2
      if (halfWidth > 0) {
        offsetRef.current = (elapsed * SPEED) % halfWidth
        track!.style.transform = `translateX(-${offsetRef.current}px)`
      }
      rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)
    rafRef.current = rafId

    return () => {
      cancelAnimationFrame(rafId)
      startTimeRef.current = null
    }
  }, [deals])

  // Duplicate items for seamless loop
  const items = deals.length > 0 ? [...deals, ...deals] : []

  const updatedLabel = fetchedAt
    ? `Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Awaiting first fetch'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0f1e',
        fontFamily: "'Courier New', Courier, monospace",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#e2e8f0',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 16px',
          background: '#111827',
          borderBottom: '1px solid #1e3a5f',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#22c55e',
            flexShrink: 0,
            animation: 'pulse 2s infinite',
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: '#22d3ee',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          EDGAR Deal Tape
        </span>
        <span
          style={{
            fontSize: 10,
            color: '#475569',
            marginLeft: 'auto',
          }}
        >
          {loading ? 'Loading…' : error ? 'Error loading data' : updatedLabel}
        </span>
      </div>

      {/* Ticker strip */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Fade edges */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 48,
            background: 'linear-gradient(to right, #0a0f1e, transparent)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 48,
            background: 'linear-gradient(to left, #0a0f1e, transparent)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        />

        {loading && (
          <div style={{ width: '100%', textAlign: 'center', fontSize: 13, color: '#475569' }}>
            Loading EDGAR filings…
          </div>
        )}
        {error && (
          <div style={{ width: '100%', textAlign: 'center', fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}
        {!loading && !error && deals.length === 0 && (
          <div style={{ width: '100%', textAlign: 'center', fontSize: 13, color: '#475569', padding: '0 20px' }}>
            No recent filings found. The hourly fetch will populate data shortly.
          </div>
        )}
        {!loading && deals.length > 0 && (
          <div
            ref={trackRef}
            style={{
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
              willChange: 'transform',
            }}
          >
            {items.map((deal, i) => {
              const color = FORM_COLORS[deal.formType] ?? '#94a3b8'
              const label = FORM_LABELS[deal.formType] ?? deal.formType
              return (
                <a
                  key={`${deal.id}-${i}`}
                  href={deal.edgarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${deal.company} — ${deal.formType} filed ${deal.filedDate}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 28px',
                    textDecoration: 'none',
                    borderRight: '1px solid #1e3a5f',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 'bold',
                      padding: '2px 6px',
                      borderRadius: 3,
                      letterSpacing: 0.5,
                      background: `${color}22`,
                      color,
                      border: `1px solid ${color}44`,
                    }}
                  >
                    {deal.formType}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 'bold',
                      color: '#f1f5f9',
                      maxWidth: 220,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {deal.company}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
                  <span style={{ fontSize: 10, color: '#475569' }}>{formatDate(deal.filedDate)}</span>
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 16px',
          background: '#0f172a',
          borderTop: '1px solid #1e293b',
          flexShrink: 0,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(FORM_LABELS).map(([form, label]) => (
            <div key={form} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#64748b' }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: FORM_COLORS[form] ?? '#94a3b8',
                }}
              />
              <span>{form} — {label}</span>
            </div>
          ))}
        </div>
        <a
          href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 9, color: '#334155', textDecoration: 'none' }}
        >
          SEC EDGAR ↗
        </a>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
