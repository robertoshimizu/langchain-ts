import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import dotenv from 'dotenv'

import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { chatModel } from '../models/anthropic'
// import { Document } from '@langchain/core/documents'
import { createRetrievalChain } from 'langchain/chains/retrieval'

dotenv.config()

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
process.env.OPENAI_API_KEY

/**
 * Parses data from webpages
 * @param {string} url - the url of the webpage
 * @returns {Promise<Record<string, any>>[]}
 */

async function cheerio(
  url: string = 'https://www.in.gov.br/en/web/dou/-/resolucao-normativa-rn-n-465-de-24-de-fevereiro-de-2021-306209339'
): Promise<Array<Record<string, any>>> {
  console.log(url)
  const loader = new CheerioWebBaseLoader(url)

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

async function docSplitter(docs: any) {
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

const memoryVectorStore = async (splitDocs?: any, embeddings?: any) => {
  const vec = await MemoryVectorStore.fromDocuments(splitDocs, embeddings)
  return vec
}
/**
 * This chain will take an incoming question, look up relevant documents, then pass those documents along with the original question into an LLM and ask it to answer the original question.
 * @returns {Runnable}
 */
const retrievalChain = async (retriever?: any) => {
  const prompt =
    ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

    <context>
    {context}
    </context>

    Question: {input}`)

  const chatModel = new ChatOpenAI({})

  const documentChain = await createStuffDocumentsChain({
    llm: chatModel,
    prompt
  })

  // const vectorstore = await memoryVectorStore()

  // const retriever = vectorstore.asRetriever()

  const retrievalChain = await createRetrievalChain({
    combineDocsChain: documentChain,
    retriever
  })

  return retrievalChain
}

/**
 * Main function
 */
async function main() {
  // const url = 'https://docs.smith.langchain.com/user_guide'
  const docs = await cheerio()
  const splitDocs = await docSplitter(docs)
  const vectorstore = await memoryVectorStore(splitDocs, embeddings)
  const retriever = vectorstore.asRetriever()

  const question = 'o que diz a DUT n 71 do anexo 2 da RN 465/2021 da ANS?'

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const retrieval_chain = await retrievalChain(retriever)

  // await documentChain.invoke({
  //   input: question,
  //   context: [
  //     new Document({
  //       pageContent:
  //       'LangSmith is a platform for building production-grade LLM applications.'
  //     })
  //   ]
  // })
  const result = await retrieval_chain.invoke({
    input: question
  })

  console.log(result.answer)
}

// npx ts-node src/lcel/retrieval_chain.ts
void main()
