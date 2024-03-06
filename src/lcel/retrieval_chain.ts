import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

import { OpenAIEmbeddings } from '@langchain/openai'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import dotenv from 'dotenv'

import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { chatModel } from '../models/anthropic'
import { Document } from '@langchain/core/documents'

dotenv.config()

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
process.env.OPENAI_API_KEY

/**
 * Parses data from webpages
 * @param {string} url - the url of the webpage
 * @returns {Promise<Record<string, any>>[]}
*/

async function cheerio (url: string): Promise<Array<Record<string, any>>> {
  const loader = new CheerioWebBaseLoader(
    url
  )

  const docs = await loader.load()

  console.log(docs.length)
  console.log(docs[0].pageContent.length)

  return docs
}
/**
 * split the document into more manageable chunks
 * @param {Record<string, any>} docs - the document to be split
 * @returns {Promise<Record<string, any>>[]}
*/

async function docSplitter (docs: any) {
  const splitter = new RecursiveCharacterTextSplitter()

  const splitDocs = await splitter.splitDocuments(docs)

  console.log(splitDocs.length)
  console.log(splitDocs[0].pageContent.length)

  return splitDocs
}
/**
 * OpenAI embeddings to create a numerical representation of textual data
 */
const embeddings = new OpenAIEmbeddings()

/**
 * Store vectors in memory
 * @param {Record<string, any>} splitDocs - the document to be split
 * @param {Record<string, any>} embeddings - the embeddings to be stored
 * @returns {Promise<void>}
*/

async function memoryVectorStore (splitDocs: any, embeddings: any) {
  const vectorstore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings
  )
  return vectorstore
}

/**
 * This chain will take an incoming question, look up relevant documents, then pass those documents along with the original question into an LLM and ask it to answer the original question.
 * @param {string} question - the question to be answered
 * @param {string} url - the url of the webpage to be searched
 * @returns {RunnableSequence<Record<string, unknown>, string>}
 */
const retrievalChain = async () => {
  const prompt =
  ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

    <context>
    {context}
    </context>

    Question: {input}`)

  const documentChain = await createStuffDocumentsChain({
    llm: chatModel,
    prompt
  })

  return documentChain
}

/**
 * Main function
 */
async function main () {
  const url = 'https://docs.smith.langchain.com/user_guide'
  const docs = await cheerio(url)
  const splitDocs = await docSplitter(docs)
  const vectorstore = await memoryVectorStore(splitDocs, embeddings)

  const question = 'what is LangSmith?'

  const documentChain = await retrievalChain()

  await documentChain.invoke({
    input: question,
    context: [
      new Document({
        pageContent:
        'LangSmith is a platform for building production-grade LLM applications.'
      })
    ]
  })
}

// npx ts-node src/lcel/retrieval_chain.ts
void main()
