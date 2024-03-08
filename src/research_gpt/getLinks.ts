import { Documento, QuestionItem } from './entities'
import { SerpApi } from './serpapi'
import { webScraper } from './web_scraper'

export async function getLinks(input: string): Promise<Documento[]> {
  //console.log('Getting links for:', input)
  try {
    const serpai = new SerpApi()
    const searches = await serpai.searchLink(input)
    return searches
  } catch (error) {
    console.error('Error fetching documents from API:', error)
  }
  return []
}

function extractCodeFromUrl(
  url: string
): { type: string; code: string } | null {
  const patterns = {
    statsPearl: /https:\/\/www\.ncbi\.nlm\.nih\.gov\/books\/(NBK\d+)/,
    pmc: /https:\/\/www\.ncbi\.nlm\.nih\.gov\/pmc\/articles\/(PMC\d+)/,
    medscape: /emedicine\.medscape\.com\//,
    drugs: /www\.drugs\.com\//
  }

  for (const type in patterns) {
    const match = url.match(patterns[type as keyof typeof patterns])
    if (match != null) {
      return { type, code: match[1] }
    }
  }

  return null
}

export async function processLinks(items: QuestionItem[]): Promise<any[]> {
  // Map over each category to process its links in parallel
  if (items.length === 0) {
    console.log('No links processed')
    return []
  }
  const processedItems = await Promise.all(
    items.map(async (item: QuestionItem) => {
      // Determine the category name (e.g., 'statsPearl', 'pmc', etc.)

      const categoryInfo = extractCodeFromUrl(item.url)
      const category = categoryInfo != null ? categoryInfo.type : 'others'

      // Process each link in the category in parallel
      const scrapeData = await webScraper(category, item.url)
      //console.log('Scraped link for :', item.url)

      return {
        question: item.question,
        context: item.context,
        text: scrapeData,
        title: item.title,
        url: item.url
      }
    })
  )

  return processedItems
}
