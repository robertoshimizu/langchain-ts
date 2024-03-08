import { SerpAPILoader } from 'langchain/document_loaders/web/serpapi'
import { type PageContent, type Documento, type Metadata } from './entities'

interface SerpApiPayload {
  engine: string
  api_key: string
  q: string
  gl?: string
  location?: string
}

// Load environment variables from .env file

export class SerpApi {
  private readonly api_key: string
  constructor () {
    const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY // Load API key from environment variable
    if (SERPAPI_API_KEY == null) {
      throw new Error(
        'SERPAPI_API_KEY is not set in the environment variables.'
      )
    }
    this.api_key = SERPAPI_API_KEY
  }

  async searchLink (query: string): Promise<Documento[]> {
    const source =
      'site:scielo.br/ OR site:ncbi.nlm.nih.gov/pmc/ OR site:cochranelibrary.com/ OR site:drugs.com/pro/ OR site:medscape.com/ OR site:ncbi.nlm.nih.gov/books/ OR site:merckmanuals.com/professional/ OR site:nice.org.uk/guidance/ OR site:who.int/publications/ OR site:cdc.gov'
    const payload: SerpApiPayload = {
      engine: 'google',
      api_key: this.api_key,
      q: `(${query}) ${source}`,
      gl: 'br'
    }
    try {
      const loader = new SerpAPILoader(payload)
      const results = await loader.load()
      const documents: Documento[] = results.map(result => {
        // Directly parse pageContent from the result string, assuming it's a JSON string
        const pageContent = JSON.parse(result.pageContent) as PageContent
        // Create metadata object, assuming the source and responseType are available in the result
        const metadata = result.metadata as Metadata

        return { pageContent, metadata }
      })
      return documents.length < 3 ? documents : documents.slice(0, 3)
    } catch (error) {
      console.log('Error retrieving SerpAPILoader:', error)
      return []
    }
  }
}
