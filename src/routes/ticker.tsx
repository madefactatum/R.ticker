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

const MONTHS = ['Jan.','Feb.','Mar.','Apr.','May','June',
                'July','Aug.','Sept.','Oct.','Nov.','Dec.']

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00Z')
  const m = d.getUTCMonth()
  const day = d.getUTCDate()
  return `${MONTHS[m]} ${day}`
}

// Bluebook Table T6 — institutional word abbreviations
const BB: Record<string, string> = {
  'Acquisition': 'Acq.', 'Acquisitions': 'Acqs.',
  'Associates': 'Assocs.', 'Association': "Ass'n",
  'Bancorporation': 'Bancorp.', 'Bancorp': 'Bancorp.',
  'Brothers': 'Bros.', 'Building': 'Bldg.',
  'Capital': 'Cap.', 'Chemical': 'Chem.',
  'Commission': "Comm'n", 'Communications': "Commc'ns",
  'Community': 'Cmty.', 'Company': 'Co.', 'Companies': 'Cos.',
  'Construction': 'Constr.', 'Continental': "Cont'l",
  'Corporation': 'Corp.', 'Development': 'Dev.',
  'Education': 'Educ.', 'Electric': 'Elec.',
  'Engineering': "Eng'g", 'Enterprise': 'Enter.',
  'Enterprises': 'Enters.', 'Entertainment': "Entm't",
  'Environmental': 'Envtl.', 'Equipment': 'Equip.',
  'Exchange': 'Exch.', 'Federal': 'Fed.',
  'Financial': 'Fin.', 'Foundation': 'Found.',
  'General': 'Gen.', 'Global': 'Glob.',
  'Government': "Gov't", 'Group': 'Grp.',
  'Holding': 'Holding', 'Holdings': 'Holding',
  'Incorporated': 'Inc.', 'Industries': 'Indus.',
  'Industry': 'Indus.', 'Information': 'Info.',
  'Insurance': 'Ins.', 'International': "Int'l",
  'Investment': 'Inv.', 'Investments': 'Invs.',
  'Laboratory': 'Lab.', 'Laboratories': 'Labs.',
  'Limited': 'Ltd.', 'Management': 'Mgmt.',
  'Manufacturing': 'Mfg.', 'Medical': 'Med.',
  'Mortgage': 'Mortg.', 'Municipal': 'Mun.',
  'National': "Nat'l", 'Organization': 'Org.',
  'Pharmaceutical': 'Pharm.', 'Pharmaceuticals': 'Pharms.',
  'Products': 'Prods.', 'Professional': "Prof'l",
  'Properties': 'Props.', 'Property': 'Prop.',
  'Publishing': "Publ'g", 'Regional': "Reg'l",
  'Resources': 'Res.', 'Sciences': 'Scis.',
  'Security': 'Sec.', 'Securities': 'Sec.',
  'Service': 'Serv.', 'Services': 'Servs.',
  'Solutions': 'Sols.', 'System': 'Sys.', 'Systems': 'Sys.',
  'Technologies': 'Techs.', 'Technology': 'Tech.',
  'Therapeutics': 'Therapeutics', 'Transportation': 'Transp.',
  'University': 'Univ.', 'Utility': 'Util.', 'Utilities': 'Utils.',
}

// Bluebook formula for words not in T6:
// words of 5 letters or fewer stay in full;
// longer words drop interior vowels to compress
function bluebookAbbr(word: string): string {
  if (word.length <= 5) return word
  const first = word[0]
  const last = word[word.length - 1]
  const middle = word.slice(1, -1).replace(/[aeiou]/gi, '')
  return (first + middle + last + '.').replace(/\.\./, '.')
}

function cleanCompany(name: string): string {
  let clean = name.replace(/\s*\(.*?\)\s*$/, '').trim()
  clean = clean.replace(/\/[A-Z]{2}\/$/, '').trim()
  if (clean === clean.toUpperCase()) {
    clean = clean.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }
  clean = clean.replace(/\b([A-Za-z']+)\b/g, (match) => {
    const normalized = match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()
    if (BB[normalized]) return BB[normalized]
    return bluebookAbbr(match)
  })
  return clean
}

export const Route = createFileRoute('/ticker')({
  head: () => ({
    meta: [{ title: 'Deals — The Registrant' }],
  }),
  component: TickerPage,
})

const SPEED = 150 // px/s — matches original

function TickerPage() {
  const [deals, setDeals] = useState<Deal[]>([])
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
      color: '#c8c0b0',
    }}>


      {/* Ticker strip */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
      }}>

        {/* Fade right edge */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 48,
          background: 'linear-gradient(to right, transparent, #0f0f0f)',
          zIndex: 10, pointerEvents: 'none',
        }} />

        {loading && (
          <span style={{ paddingLeft: 24, fontSize: 11, color: '#444' }}>
            Loading&hellip;
          </span>
        )}
        {error && (
          <span style={{ paddingLeft: 24, fontSize: 11, color: '#888' }}>
            {error}
          </span>
        )}
        {!loading && !error && deals.length === 0 && (
          <span style={{ paddingLeft: 24, fontSize: 11, color: '#444' }}>
            No recent filings
          </span>
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
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '0 1px',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <span style={{
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  color: '#a89070',
                  textTransform: 'uppercase' as const,
                }}>
                  {deal.formType || '-'}
                </span>
                <span style={{ fontSize: 13, color: '#c8c0b0' }}>
                  {cleanCompany(deal.company)}
                </span>
                <span style={{ fontSize: 10, color: '#444' }}>
                  {formatDate(deal.filedDate)}
                </span>
                <span style={{ color: '#2a2a2a', fontSize: 10, marginLeft: 1 }}>◆</span>
              </a>
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
