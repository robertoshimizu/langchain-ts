import { TavilySearchResults } from '@langchain/community/tools/tavily_search'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { createRetrieverTool } from 'langchain/tools/retriever'
import dotenv from 'dotenv'
import { type ChatPromptTemplate } from '@langchain/core/prompts'
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents'
import { pull } from 'langchain/hub'
dotenv.config()

function search () {
  const searchTool = new TavilySearchResults()

  return searchTool

  // const toolResult = await searchTool.invoke('Guidelines for community acquired pneumonia treatment in adults')

  // interface Result {
  //   title: string
  //   url: string
  //   content: string
  //   score: number
  //   raw_content: string
  // }

  // const results = JSON.parse(toolResult).map((result: Result) => {
  //   return {
  //     title: result.title,
  //     url: result.url,
  //     content: result.content,
  //     score: result.score
  //   }
  // })

  // const qq = await cheerio(results[3].url)
}

/**
 * Parses data from webpages
 * @param {string} url - the url of the webpage
 * @returns {Promise<Record<string, any>>[]}
*/

async function cheerio (url: string = 'https://docs.smith.langchain.com/user_guide') {
  console.log(url)
  const loader = new CheerioWebBaseLoader(
    url
  )

  const rawDocs = await loader.load()

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  })
  const docs = await splitter.splitDocuments(rawDocs)

  return docs
}

async function main () {
  const searchTool = search()
  const docs = await cheerio()
  const vectorstore = await MemoryVectorStore.fromDocuments(
    docs,
    new OpenAIEmbeddings()
  )
  const retriever = vectorstore.asRetriever()

  const retrieverTool = createRetrieverTool(retriever, {
    name: 'langsmith_search',
    description:
    'Search for information about LangSmith. For any questions about LangSmith, you must use this tool!'
  })

  const tools = [searchTool, retrieverTool]

  const llm = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo',
    temperature: 0
  })

  // Get the prompt to use - you can modify this!
  // If you want to see the prompt in full, you can at:
  // https://smith.langchain.com/hub/hwchase17/openai-functions-agent
  const prompt = await pull<ChatPromptTemplate>(
    'hwchase17/openai-functions-agent'
  )

  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt
  })

  const agentExecutor = new AgentExecutor({
    agent,
    tools
  })

  const result1 = await agentExecutor.invoke({
    input: 'hi!'
  })

  console.log(result1)

  const result2 = await agentExecutor.invoke({
    input: 'how can langsmith help with testing?'
  })

  console.log(result2)
}

// npx ts-node src/lcel/agents.ts
void main()
