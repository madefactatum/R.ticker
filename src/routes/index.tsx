import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

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

const FORM_COLORS: Record<string, string> = {
  'S-4': '#22d3ee',
  'S-4/A': '#67e8f9',
  'F-4': '#a78bfa',
  'F-4/A': '#c4b5fd',
  'SC TO-T': '#fb923c',
  'SC TO-I': '#fbbf24',
  'SC 13E-3': '#f87171',
}

export const Route = createFileRoute('/')({
  component: AdminPage,
})

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function AdminPage() {
  const [data, setData] = useState<DealsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const tickerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/ticker`
    : '/ticker'

  const embedCode = `<iframe
  src="${tickerUrl}"
  width="100%"
  height="80"
  frameborder="0"
  scrolling="no"
  style="border:none;display:block;">
</iframe>`

  async function loadDeals() {
    try {
      const res = await fetch('/api/deals')
      const json: DealsResponse = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDeals() }, [])

  async function copyEmbed() {
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-cyan-400 tracking-wide">EDGAR Deal Tape</h1>
            <p className="text-xs text-gray-500 mt-0.5">S-4 · F-4 · Tender Offers · Going Private — updated hourly</p>
          </div>
          <a
            href="/ticker"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm rounded-lg hover:bg-cyan-500/20 transition-colors"
          >
            Preview Ticker ↗
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Status cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Filings</div>
            <div className="text-3xl font-bold text-white">
              {loading ? '—' : (data?.count ?? 0)}
            </div>
            <div className="text-xs text-gray-600 mt-1">last 90 days</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Fetched</div>
            <div className="text-lg font-semibold text-white mt-1">
              {loading ? '—' : data?.fetchedAt
                ? new Date(data.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Not yet'}
            </div>
            <div className="text-xs text-gray-600 mt-1">refreshes every hour</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Data Source</div>
            <div className="text-lg font-semibold text-cyan-400 mt-1">SEC EDGAR</div>
            <a
              href="https://efts.sec.gov/LATEST/search-index"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              EDGAR Full-Text Search API ↗
            </a>
          </div>
        </div>

        {/* Embed code */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Embed in Google Sites</h2>
              <p className="text-xs text-gray-500 mt-0.5">Insert → Embed → paste the URL, or use the iframe HTML in a Custom HTML widget</p>
            </div>
            <button
              onClick={copyEmbed}
              className="px-3 py-1.5 text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy HTML'}
            </button>
          </div>
          <pre className="bg-gray-950 rounded-lg p-4 text-xs text-gray-400 overflow-x-auto border border-gray-800 whitespace-pre-wrap">
{embedCode}
          </pre>
          <p className="text-xs text-gray-600 mt-3">
            Ticker URL: <a href={tickerUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">{tickerUrl}</a>
          </p>
        </div>

        {/* Filing table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Recent Filings</h2>
            {data?.message && <span className="text-xs text-amber-400">{data.message}</span>}
          </div>
          {loading && (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">Loading…</div>
          )}
          {!loading && (!data?.deals || data.deals.length === 0) && (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">
              No filings yet. The scheduled function runs every hour and will populate this table shortly after the first deploy.
            </div>
          )}
          {!loading && data && data.deals.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Filing Type</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Filed</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data.deals.slice(0, 100).map((deal) => {
                    const color = FORM_COLORS[deal.formType] ?? '#94a3b8'
                    return (
                      <tr key={deal.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-6 py-3">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{
                              background: `${color}22`,
                              color,
                              border: `1px solid ${color}44`,
                            }}
                          >
                            {deal.formType}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-200 max-w-xs truncate">{deal.company}</td>
                        <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(deal.filedDate)}</td>
                        <td className="px-6 py-3">
                          <a
                            href={deal.edgarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-cyan-500 hover:text-cyan-300 transition-colors"
                          >
                            EDGAR ↗
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
