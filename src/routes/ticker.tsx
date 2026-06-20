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
}

const MONTHS = ['Jan.','Feb.','Mar.','Apr.','May','June',
                'July','Aug.','Sept.','Oct.','Nov.','Dec.']

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`
}

function cleanCompany(name: string): string {
  // Strip ticker symbols in parentheses e.g. "DICK'S SPORTING GOODS, INC.  (DKS)"
  return name.replace(/\s*\(.*?\)\s*$/, '').trim()
}

export const Route = createFileRoute('/ticker')({
  head: () => ({
    meta: [{ title: 'Deals — The Registrant' }],
  }),
  component: TickerPage,
})

const SPEED = 50 // px/s — steady, not rushed

function TickerPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const trackRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number | null>(null)

  async function loadDeals() {
    try {
      const res = await fetch('/api/deals')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: DealsResponse = await res.json()
      setDeals(data.deals ?? [])
    } catch (e) {
      console.error('Deal feed error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeals()
    const interval = setInterval(loadDeals, 60 * 60 * 1000)
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
        track!.style.transform = `translateX(-${(elapsed * SPEED) % halfWidth}px)`
      }
      rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(rafId)
      startTimeRef.current = null
    }
  }, [deals])

  const items = deals.length > 0 ? [...deals, ...deals] : []

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0f0f0f',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      fontWeight: 300,
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
    }}>

      {/* Deals label */}
      <div style={{
        flexShrink: 0,
        padding: '0 18px',
        fontSize: 11,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#a89070',
        borderRight: '1px solid #2a2a2a',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        background: '#0f0f0f',
        zIndex: 2,
      }}>
        Deals
      </div>

      {/* Ticker track */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>

        {/* Fade right edge */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 48,
          background: 'linear-gradient(to right, transparent, #0f0f0f)',
          zIndex: 10, pointerEvents: 'none',
        }} />

        {loading && (
          <span style={{ paddingLeft: 24, fontSize: 11, color: '#444' }}>Loading&hellip;</span>
        )}

        {!loading && deals.length === 0 && (
          <span style={{ paddingLeft: 24, fontSize: 11, color: '#444' }}>No recent filings</span>
        )}

        {!loading && deals.length > 0 && (
          <div ref={trackRef} style={{
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            willChange: 'transform',
          }}>
            {items.map((deal, i) => (
              <a
                key={`${deal.id}-${i}`}
                href={deal.edgarUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 24px' }}
              >
                <span style={{ fontSize: 9, letterSpacing: '0.14em', color: '#a89070', textTransform: 'uppercase' }}>
                  {deal.formType || 'Filing'}
                </span>
                <span style={{ fontSize: 13, color: '#c8c0b0' }}>
                  {cleanCompany(deal.company)}
                </span>
                <span style={{ fontSize: 10, color: '#444' }}>
                  {formatDate(deal.filedDate)}
                </span>
              </a>
            ))}
            {/* Diamond separators between items */}
            {items.map((_, i) => (
              <span key={`sep-${i}`} style={{ color: '#2a2a2a', fontSize: 10, margin: '0 -20px' }}>◆</span>
            ))}
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; overflow: hidden; background: #0f0f0f; }
      `}</style>
    </div>
  )
}
