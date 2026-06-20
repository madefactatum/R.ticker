import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'

const FILING_TYPES = 'S-4,F-4,SC TO-T,SC TO-I,SC 13E-3,S-4/A,F-4/A'
const DAYS_BACK = 14 // look back 14 days for recent filings

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

export default async function handler(req: Request) {
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
    console.error(`EDGAR fetch failed: ${response.status} ${response.statusText}`)
    return
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
    const accessionDashes = accessionNo.replace(/-/g, '')
    const edgarUrl = accessionNo
      ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${encodeURIComponent(src.form_type ?? '')}&dateb=&owner=include&count=10`
      : 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=S-4'

    return {
      id: hit._id,
      company,
      formType: src.form_type ?? '',
      filedDate: src.file_date ?? '',
      accessionNo,
      edgarUrl: accessionNo
        ? `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionDashes.replace(/-/g, '')}/`
        : edgarUrl,
    }
  })

  // Sort by date descending
  deals.sort((a, b) => b.filedDate.localeCompare(a.filedDate))

  const store = getStore('edgar-filings')
  await store.setJSON('latest', {
    deals,
    fetchedAt: new Date().toISOString(),
    count: deals.length,
  })

  console.log(`Stored ${deals.length} EDGAR filings`)
}

export const config: Config = {
  schedule: '0 * * * *', // every hour
}
