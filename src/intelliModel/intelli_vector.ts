/* eslint-disable @typescript-eslint/no-unused-vars */
import * as readline from 'readline'
import { ChatOpenAI } from '@langchain/openai'
import dotenv from 'dotenv'
import {
  ChatPromptTemplate,
  MessagesPlaceholder
} from '@langchain/core/prompts'
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
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools'
import { z } from 'zod'
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents'

dotenv.config()

async function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

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
      const results = await this.vectorStore.similaritySearchWithScore(query)
      console.log('Results:', results)
      return JSON.stringify(results)
    } catch (error) {
      console.error('Error searching PineconeStore', error)
    }
  }
}
const get_tuss = async (query: string) => {
  console.log('My function')
  const tuss = new Tuss()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const res = await tuss.search(query)
  return res?.toString()
}

const get_tuss_info = new DynamicStructuredTool({
  name: 'TUSS_Search',
  description: `Call this to get the TUSS of a medical, therapeutic, diagnostic procedure, OR materials and medicines.
                  There is a close relationship among TUSS, the ANS list (rol ANS), and the Technical Use Guidelines (DUTs).
                  If the term is uncomplete, you need to return all documents that contain the name of the term.`,
  schema: z.object({
    name_of_term: z
      .string()
      .describe(
        'term that describes a medical, therapeutic, diagnostic procedures OR  materials and medicine'
      )
  }),
  func: async ({ name_of_term }) => {
    const result = await get_tuss(name_of_term)
    return result || '' // Ensure a string value is always returned, even if it is undefined
  }
})

class DUT {
  private vectorStore!: PineconeStore
  private selfQueryRetriever!: SelfQueryRetriever<any>
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
      //console.log('Indexes:', indexes)
      const dut_index_info = await pc.describeIndex('dut')
      console.log('dut index: ', dut_index_info)
      const pineconeIndex = pc.Index('dut')

      this.vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings(),
        { pineconeIndex }
      )

      const attributeInfo: AttributeInfo[] = [
        {
          name: 'numero',
          description:
            'numero da DUT - Diretriz de Utilizacao para Cobertura de Procedimento',
          type: 'string'
        },
        {
          name: 'nome',
          description: 'Nome da DUT',
          type: 'string'
        }
      ]
      const llm = new ChatOpenAI()
      const documentContents =
        'Diretrizes de Utilizacao (DUT) para Cobertura de Procedimentos na Saude Suplementar publicados no anexo 2 da Resolucao 465/2021 da ANS'

      this.selfQueryRetriever = await SelfQueryRetriever.fromLLM({
        llm,
        vectorStore: this.vectorStore,
        documentContents,
        attributeInfo,
        structuredQueryTranslator: new FunctionalTranslator()
      })

      console.log('PineconeStore initiated ...')
    } catch (error) {
      console.error('Opss, error initiating PineconeStore', error)
    }
  }

  public async ensureInitialized() {
    await this.initializationPromise
  }

  async search_by_term(query: string) {
    await this.ensureInitialized() // Ensure the class is initialized before searching
    try {
      const results = await this.vectorStore.similaritySearchWithScore(query)
      console.log('Results:', results)
      return JSON.stringify(results)
    } catch (error) {
      console.error('Error searching PineconeStore', error)
    }
  }
  async search_by_number(dut_number: string) {
    await this.ensureInitialized() // Ensure the class is initialized before searching
    try {
      // const results = await this.selfQueryRetriever.getRelevantDocuments(
      //   `return the DUT for the number:  ${dut_number.toString()}`
      // )
      this.vectorStore.filter = {
        numero: { $eq: dut_by_number.toString() }
      }
      const results = await this.vectorStore.similaritySearch(
        `Find the DUT for the number: ${dut_number.toString()}`
      )
      console.log('Results:', results)
      return JSON.stringify(results)
    } catch (error) {
      console.error('Error searching PineconeStore', error)
    }
  }
}
const dut_by_term = async (query: string) => {
  console.log('dut_by_term')
  const dut = new DUT()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const res = await dut.search_by_term(query)
  return res?.toString()
}

const dut_by_number = async (query: string) => {
  console.log('dut_by_term')
  const dut = new DUT()
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const res = await dut.search_by_number(query)
  return res?.toString()
}

const get_dut_by_term = new DynamicStructuredTool({
  name: 'DUT_SearchByTerm',
  description: `Call this to get the DUT of a medical, therapeutic or diagnostic procedure. Diretriz de Utilização para Cobertura 
                de Procedimento na Saúde Suplementar, comumente referida como DUT (Diretriz de Utilização de Tecnologia em Saúde)`,
  schema: z.object({
    terms_of_dut: z
      .string()
      .describe(
        'terms that describes the DUT, which can be a medical, therapeutic or diagnostic procedure'
      )
  }),
  func: async ({ terms_of_dut }) => {
    const result = await dut_by_term(terms_of_dut)
    return result || '' // Ensure a string value is always returned, even if it is undefined
  }
})

const get_dut_by_number = new DynamicStructuredTool({
  name: 'DUT_SearchByNumber',
  description: `Call this to get the DUT of a medical, therapeutic or diagnostic procedure. Diretriz de Utilização para Cobertura 
                de Procedimento na Saúde Suplementar, comumente referida como DUT (Diretriz de Utilização de Tecnologia em Saúde)`,
  schema: z.object({
    dut_number: z
      .string()
      .describe(
        'number that refers to the index of a DUT in the annex II of the RN 465/2021 of ANS'
      )
  }),
  func: async ({ dut_number }) => {
    const result = await dut_by_number(dut_number)
    return result || '' // Ensure a string value is always returned, even if it is undefined
  }
})

class Agent {
  private llm: any
  private tools: DynamicTool[]
  private prompt: ChatPromptTemplate
  private agent: any
  private agentExecutor: AgentExecutor | null = null

  constructor(tools: any) {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo-1106',
      temperature: 0
    })
    this.tools = tools
    this.prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are a helpful assistant to provide data for a medical term. You are going to research and provide the information to another llm model downstream.
        There is a close relationship among TUSS, the ANS list (rol ANS), and the Technical Use Guidelines (DUTs). If during the search, it retrieves more than one document,
        then you MUST provide all the documents for all of them. YOU must provide the llm downstream the most complete information so it can have conditions to answer its questions.
        YOU MUST answer in the language idiom of the query.
        If you cannot find any information you MUST return an empty screen.`
      ],
      ['user', '{input}'],
      new MessagesPlaceholder('agent_scratchpad')
    ])
  }

  async initializeAgent() {
    this.agent = await createOpenAIFunctionsAgent({
      llm: this.llm,
      tools: this.tools,
      prompt: this.prompt
    })
    this.agentExecutor = new AgentExecutor({
      agent: this.agent,
      tools: this.tools,
      verbose: false,
      maxIterations: 5
    })
  }

  async executeAgent(input: string) {
    if (!this.agentExecutor) {
      throw new Error('AgentExecutor is not initialized.')
    }
    const result = await this.agentExecutor.invoke({ input })
    return result.output
  }
}

export function getAgent() {
  const tools = [get_tuss_info, get_dut_by_term, get_dut_by_number]
  const agent = new Agent(tools)
  return agent
}

async function main() {
  console.log('Starting...')
  //const tuss = new Tuss()
  // Wait for the initialization to complete before searching
  // await new Promise((resolve) => setTimeout(resolve, 1000))
  // const res = await tuss.search(
  //   'qual é o código TUSS de angioplastia e informe se tem DUT?'
  // )

  // console.log('Results:', typeof res)

  const question = await askQuestion('O que você gostaria de pesquisar hoje? ')
  // 'Codigo TUSS para Hepatorrafia por videolaparoscopia'
  console.log(`query: ${question}!`)
  const agent = getAgent()
  await agent.initializeAgent()
  const output = await agent.executeAgent(question)
  console.log(output)
  // agent.initializeAgent().then(() => {
  //   agent.executeAgent(question).then(output => {
  //     console.log(output)
  //   })
  // })
}

// npx ts-node src/intelliModel/intelli_vector.ts
void main()
