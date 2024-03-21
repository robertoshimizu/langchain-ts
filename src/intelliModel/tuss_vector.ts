/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI } from '@langchain/openai'
import dotenv from 'dotenv'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { AttributeInfo } from 'langchain/schema/query_constructor'
import { OpenAIEmbeddings, OpenAI } from '@langchain/openai'
import { SelfQueryRetriever } from 'langchain/retrievers/self_query'
import { FunctionalTranslator } from 'langchain/retrievers/self_query/functional'
import { Document } from '@langchain/core/documents'
import {
  RunnablePassthrough,
  RunnableSequence
} from '@langchain/core/runnables'
import { Pinecone } from '@pinecone-database/pinecone'
import { PineconeStore } from '@langchain/pinecone'

dotenv.config()

class Tuss {
  private vectorStore!: PineconeStore
  private initializationPromise: Promise<void>

  constructor() {
    this.initializationPromise = this.init()
  }

  async init() {
    try {
      const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!
      })
      const indexes = await await pc.listIndexes()
      console.log('Indexes:', indexes)
      const tuss_index_info = await pc.describeIndex('tuss')
      console.log('tuss index: ', tuss_index_info)
      const pineconeIndex = pc.Index('tuss')

      this.vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings(),
        { pineconeIndex }
      )
      console.log('PineconeStore initiated ...')
    } catch (error) {
      console.error('Opss, error initiating PineconeStore', error)
    }
  }

  public async ensureInitialized() {
    await this.initializationPromise
  }

  async search(query: string) {
    await this.ensureInitialized() // Ensure the class is initialized before searching
    try {
      const results = await this.vectorStore.similaritySearch(query)
      console.log(results)
    } catch (error) {
      console.error('Error searching PineconeStore', error)
    }
  }
}

async function main() {
  console.log('Starting...')
  const tuss = new Tuss()
  await tuss.search(
    'qual é o código TUSS de angioplastia e informe se tem DUT?'
  )
}

// npx ts-node src/intelliModel/tuss_vector.ts
void main()
