export interface PageContent {
  position: number
  title: string
  link: string
  redirect_link: string
  displayed_link: string
  favicon: string
  author?: string
  cited_by?: string
  extracted_cited_by?: number
  date?: string
  snippet?: string
  snippet_highlighted_words?: string[]
  sitelinks?: { inline: any[] } // Adjust the type according to your data
  source?: string
}

export interface Documento {
  pageContent: PageContent
  metadata: Metadata
}

export interface Metadata {
  source: string
  responseType: string
}

export interface QuestionItem {
  question: string
  context: string
  title: string
  url: string
}
