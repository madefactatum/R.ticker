import { createFileRoute } from '@tanstack/react-router'
import { getStore } from '@netlify/blobs'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=1800', // 30-min browser cache
}

const FILING_TYPES = 'S-4,F-4,SC TO-T,SC TO-I,SC 13E-3,S-4/A,F-4/A'
const DAYS_BACK = 14

interface EdgarHit {
  _id: string
  _source: {
    entity_name?: string
    display_names?: string[]
    form_type?: string
    file_date?: string
    period_of_report?: string
    accession_no?: string
    file_num?: string
  }
}

interface Deal {
  id: string
  company: string
  formType: string
  filedDate: string
  accessionNo: string
  edgarUrl: string
}

async function fetchFromEdgar(): Promise<{ deals: Deal[]; fetchedAt: string; count: number }> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - DAYS_BACK)
  const startdt = startDate.toISOString().split('T')[0]

  const encodedForms = encodeURIComponent(FILING_TYPES)
  const url = `https://efts.sec.gov/LATEST/search-index?q=&forms=${encodedForms}&dateRange=custom&startdt=${startdt}&hits.hits._source=entity_name,display_names,form_type,file_date,period_of_report,accession_no,file_num`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'EDGAR-Ticker/1.0 (Netlify; contact@example.com)',
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`EDGAR fetch failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const hits: EdgarHit[] = data?.hits?.hits ?? []

  const deals: Deal[] = hits.map((hit) => {
    const src = hit._source
    const company =
      src.display_names?.[0]?.replace(/\s*\(CIK.*\)/, '').trim() ||
      src.entity_name ||
      'Unknown Company'

    const accessionNo = src.accession_no ?? ''
    const cik = hit._id.split('/')[2] ?? ''
    const accessionStripped = accessionNo.replace(/-/g, '')

    return {
      id: hit._id,
      company,
      formType: src.form_type ?? '',
      filedDate: src.file_date ?? '',
      accessionNo,
      edgarUrl: accessionNo
        ? `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionStripped}/`
        : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=${encodeURIComponent(src.form_type ?? 'S-4')}`,
    }
  })

  deals.sort((a, b) => b.filedDate.localeCompare(a.filedDate))

  return {
    deals,
    fetchedAt: new Date().toISOString(),
    count: deals.length,
  }
}

export const Route = createFileRoute('/api/deals')({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async () => {
        try {
          const store = getStore('edgar-filings')
          const cached = (await store.get('latest', { type: 'json' })) as {
            deals: unknown[]
            fetchedAt: string
            count: number
          } | null

          if (cached) {
            return Response.json(cached, { headers: CORS_HEADERS })
          }

          // Cache miss — fetch live from EDGAR and warm the Blobs cache
          const result = await fetchFromEdgar()
          await store.setJSON('latest', result)
          return Response.json(result, { headers: CORS_HEADERS })
        } catch (err) {
          console.error('Failed to load filings:', err)
          return Response.json(
            { error: 'Failed to load filings', deals: [], count: 0 },
            { status: 500, headers: CORS_HEADERS },
          )
        }
      },
    },
  },
})
