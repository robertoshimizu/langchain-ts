import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { SerpAPILoader } from 'langchain/document_loaders/web/serpapi'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { createRetrievalChain } from 'langchain/chains/retrieval'
import dotenv from 'dotenv'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import axios, { AxiosInstance } from 'axios'
dotenv.config()

/**
 * Parses data from webpages
 * @param {string} url - the url of the webpage
 * @returns {Promise<Record<string, any>>[]}
 */

class ICD {
  private clientId: string
  private clientSecret: string
  private tokenEndpoint: string =
    'https://icdaccessmanagement.who.int/connect/token'
  private token: string | null = null
  private httpClient: AxiosInstance

  constructor() {
    this.clientId = process.env.ICD_CLIENT_ID!
    this.clientSecret = process.env.ICD_CLIENT_SECRET!
    this.httpClient = axios.create()

    // Initialize the instance by getting the token
    this.initialize()
  }

  private async getToken(): Promise<void> {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64')
    const config = {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'icdapi_access'
    })

    try {
      const response = await this.httpClient.post(
        this.tokenEndpoint,
        body.toString(),
        config
      )
      this.token = response.data.access_token
      console.log('Token fetched successfully: ', this.token)
    } catch (error) {
      console.error('Error fetching token:', error)
    }
  }

  private async initialize() {
    await this.getToken()
  }

  public async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    data: any = null
  ) {
    if (!this.token) {
      console.error('Token is not available, cannot make request')
      return
    }

    const config = {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    }

    try {
      const url = `https://icdapi.who.int/${endpoint}`
      let response
      if (method === 'POST') {
        response = await this.httpClient.post(url, data, config)
      } else {
        response = await this.httpClient.get(url, config)
      }
      return response.data
    } catch (error) {
      console.error('Error making request:', error)
      return null
    }
  }
}

async function main() {
  const icd = new ICD()
  // // Initialize the necessary components
  // const llm = new ChatOpenAI()
  // const embeddings = new OpenAIEmbeddings()
  // const apiKey = process.env.SERPAPI_API_KEY!
  // // Define your question and query
  // const question = 'Lupus erythematosus'.toLowerCase()
  // const query = `(${question}) site:icd.who.int/browse10/2019/en/`
  // console.log('Query:', query)
  // // Use SerpAPILoader to load web search results
  // const loader = new SerpAPILoader({ q: query, apiKey })
  // const docs = await loader.load()
  // console.log('Loaded documents:', docs[0].pageContent)
  // // Use MemoryVectorStore to store the loaded documents in memory
  // const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings)
  // const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
  //   ['system', 'Get all the icd-10 codes that include the terms:\n\n{context}'],
  //   ['human', '{input}']
  // ])
  // const combineDocsChain = await createStuffDocumentsChain({
  //   llm,
  //   prompt: questionAnsweringPrompt
  // })
  // const chain = await createRetrievalChain({
  //   retriever: vectorStore.asRetriever(),
  //   combineDocsChain
  // })
  // const res = await chain.invoke({
  //   input: question
  // })
  // console.log(res.answer)
}

// npx ts-node src/intelliModel/icd10.ts
void main()
