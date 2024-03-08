/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unused-vars */
import cheerio from 'cheerio'

// Load environment variables from .env file

interface IScraper {
  scrape: (url: string) => Promise<string>
}

function extractNBKNumber (url: string): string | null {
  const match = url.match(/NBK(\d+)/)
  return match != null ? match[1] : null
}

function extractPMCNumber (url: string): string | null {
  const match = url.match(/PMC(\d+)/)
  return match != null ? match[1] : null
}

class StatsPearlScraper implements IScraper {
  async scrape (url: string): Promise<string> {
    // Specific scraping logic for books
    const NBK = extractNBKNumber(url)
    const api = `https://api.ncbi.nlm.nih.gov/lit/oai/books/?verb=GetRecord&identifier=oai:books.ncbi.nlm.nih.gov:${NBK}&metadataPrefix=nbk_ftext`
    try {
      const response = await fetch(api)
      if (response.ok) {
        const blob = await response.text()
        const $ = cheerio.load(blob)
        let textContent = $('book-part').text()
        textContent = textContent.replace(/\s\s+/g, ' ').trim()

        const maxLength = 10000

        return textContent.slice(0, maxLength)
      }
      return ' '
    } catch (error) {
      console.error(error)
    }
    return ''
  }
}

class PMCScraper implements IScraper {
  async scrape (url: string): Promise<string> {
    // Specific scraping logic for articles
    const PMC = extractPMCNumber(url)
    const api = `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_xml/PMC${PMC}/unicode`
    try {
      const response = await fetch(api)
      if (response.ok) {
        const blob = await response.text()
        const $ = cheerio.load(blob)
        let textContent = $('passage > text').text()
        textContent = textContent.replace(/\s\s+/g, ' ').trim()

        const maxLength = 10000

        return textContent.slice(0, maxLength)
      }
    } catch (error) {
      console.error(error)
    }
    return ''
  }
}

class MedscapeScraper implements IScraper {
  async scrape (url: string): Promise<string> {
    // Specific scraping logic for Medscape
    return 'Scraped data for Medscape'
  }
}

class DrugsScraper implements IScraper {
  async scrape (url: string): Promise<string> {
    // Specific scraping logic for Drugs.com
    return 'Scraped data for Drugs.com'
  }
}

class OthersScraper implements IScraper {
  async scrape (url: string): Promise<string> {
    try {
      const response = await fetch(url)
      const htmlContent = await response.text()

      const $ = cheerio.load(htmlContent)

      // Remove script, style tags, and comments
      $('script, style').remove()
      $('*')
        .contents()
        .each(function () {
          if (this.nodeType === 8) {
            // Node type 8 corresponds to comments
            $(this).remove()
          }
        })

      // Extracting text and removing extra whitespace
      let textContent = $('body').text()
      textContent = textContent.replace(/\s\s+/g, ' ').trim()

      const maxLength = 10000

      return textContent.slice(0, maxLength)
    } catch (error: any) {
      console.error('Error fetching the page:', error.message)
      return ''
    }
  }
}

export async function webScraper (category: string, url: string): Promise<any> {
  let scraper: IScraper

  switch (category) {
    case 'statsPearl':
      scraper = new StatsPearlScraper()
      break
    case 'pmc':
      scraper = new PMCScraper()
      break
    case 'medscape':
      scraper = new OthersScraper()
      break
    case 'drugs':
      scraper = new OthersScraper()
      break
    default:
      scraper = new OthersScraper()
      break
  }

  const res = await scraper.scrape(url)

  return res
}
