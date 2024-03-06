import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio'

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'

import { OpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import dotenv from 'dotenv'

import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts'
import { chatModel } from '../models/anthropic'
import { Document } from '@langchain/core/documents'
import { createRetrievalChain } from 'langchain/chains/retrieval'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnableBranch, RunnableLambda, RunnableMap, RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables'
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'

dotenv.config()

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
process.env.OPENAI_API_KEY

/**
 * Parses data from webpages
 * @param {string} url - the url of the webpage
 * @returns {Promise<Record<string, any>>[]}
*/

async function cheerio (url: string = 'https://docs.smith.langchain.com/user_guide'): Promise<Array<Record<string, any>>> {
  console.log(url)
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

const memoryVectorStore = async (splitDocs?: any, embeddings?: any) => {
  const vec = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings
  )
  return vec
}
/**
 * This chain will take an incoming question, look up relevant documents, then pass those documents along with the original question into an LLM and ask it to answer the original question.
 * @returns {Runnable}
 */
// const retrievalChain = async (retriever?: any) => {
//   const prompt =
//   ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

//     <context>
//     {context}
//     </context>

//     Question: {input}`)

//   const documentChain = await createStuffDocumentsChain({
//     llm: chatModel,
//     prompt
//   })

//   // const vectorstore = await memoryVectorStore()

//   // const retriever = vectorstore.asRetriever()

//   const retrievalChain = await createRetrievalChain({
//     combineDocsChain: documentChain,
//     retriever
//   })

//   return retrievalChain
// }

/**
 * Main function
 */
// async function bullshit () {
//   // const url = 'https://docs.smith.langchain.com/user_guide'

//   const prompt = ChatPromptTemplate.fromMessages([
//     ['system', 'You are a world class technical documentation writer.'],
//     ['user', '{input}']
//   ])
//   const outputParser = new StringOutputParser()

//   const llmChain = prompt.pipe(chatModel).pipe(outputParser)

//   const answer = await prompt.invoke({
//     input: 'what is quantum physics?'
//   })

//   await documentChain.invoke({
//     input: question,
//     context: [
//       new Document({
//         pageContent:
//         'LangSmith is a platform for building production-grade LLM applications.'
//       })
//     ]
//   })
//   const func = async () => {
//     return 'Any context'
//   }

//   const chain = RunnableSequence.from([
//     {
//       input: new RunnablePassthrough(),
//       context: async () => func()
//     },
//     prompt,
//     outputParser
//   ])
//   const response = await chain.invoke({
//     input: "I can pass a single string instead of an object since I'm using `RunnablePassthrough`."
//   })

//   console.log(response)
// }

async function branch () {
  const promptTemplate =
  PromptTemplate.fromTemplate(`Given the user question below, classify it as either being about \`LangChain\`, \`Anthropic\`, or \`Other\`.
                                     
      Do not respond with more than one word.

      <question>
      {question}
      </question>

      Classification:`)

  const model = chatModel()

  const classificationChain = RunnableSequence.from([
    promptTemplate,
    model,
    new StringOutputParser()
  ])

  const classificationChainResult = await classificationChain.invoke({
    question: 'how do I call Metalica?'
  })
  console.log(classificationChainResult)

  const langChainChain = PromptTemplate.fromTemplate(
  `You are an expert in langchain.
Always answer questions starting with "As Harrison Chase told me".
Respond to the following question:

Question: {question}
Answer:`
  ).pipe(model)

  const anthropicChain = PromptTemplate.fromTemplate(
  `You are an expert in anthropic. \
Always answer questions starting with "As Dario Amodei told me". \
Respond to the following question:

Question: {question}
Answer:`
  ).pipe(model)

  const generalChain = PromptTemplate.fromTemplate(
  `Respond to the following question:

Question: {question}
Answer:`
  ).pipe(model)

  const branch = RunnableBranch.from([
    [
      (x: { topic: string, question: string }) =>
        x.topic.toLowerCase().includes('anthropic'),
      anthropicChain
    ],
    [
      (x: { topic: string, question: string }) =>
        x.topic.toLowerCase().includes('langchain'),
      langChainChain
    ],
    generalChain
  ])

  const fullChain = RunnableSequence.from([
    {
      topic: classificationChain,
      question: (input: { question: string }) => input.question
    },
    branch
  ])

  const result1 = await fullChain.invoke({
    question: 'how do I use Anthropic?'
  })

  console.log(result1)
}

async function another () {
  const prompt = ChatPromptTemplate.fromMessages([
    ['human', 'Tell me a short joke about {topic}']
  ])
  const promptValue = await prompt.invoke({ topic: 'ice cream' })
  console.log(promptValue)
  /**
ChatPromptValue {
  messages: [
    HumanMessage {
      content: 'Tell me a short joke about ice cream',
      name: undefined,
      additional_kwargs: {}
    }
  ]
}
 */
  const promptAsMessages = promptValue.toChatMessages()
  console.log(promptAsMessages)
  /**
[
  HumanMessage {
    content: 'Tell me a short joke about ice cream',
    name: undefined,
    additional_kwargs: {}
  }
]
 */
  const promptAsString = promptValue.toString()
  console.log(promptAsString)
  /**
Human: Tell me a short joke about ice cream
 */

  const model = chatModel()
  const outputParser = new StringOutputParser()

  const chain = prompt.pipe(model).pipe(outputParser)

  const response = await chain.invoke({
    topic: 'ice cream'
  })
  console.log(response)
}

async function RunnableMapped () {
  const vectorStore = await HNSWLib.fromDocuments(
    [
      new Document({ pageContent: 'Harrison worked at Kensho' }),
      new Document({ pageContent: 'Bears like to eat honey.' })
    ],
    new OpenAIEmbeddings()
  )
  const retriever = vectorStore.asRetriever(1)

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'ai',
    `Answer the question based on only the following context:
  
{context}`
    ],
    ['human', '{question}']
  ])

  const model = new OpenAI({})

  const outputParser = new StringOutputParser()

  const setupAndRetrieval = RunnableMap.from({
    context: new RunnableLambda({
      func: async (input: string) =>
        retriever.invoke(input).then((response) => response[0].pageContent)
    }).withConfig({ runName: 'contextRetriever' }),
    question: new RunnablePassthrough()
  })
  // const chain = setupAndRetrieval.pipe(prompt).pipe(model).pipe(outputParser)
  const chain = setupAndRetrieval.pipe(prompt)

  const response = await chain.invoke('Where did Harrison work?')
  console.log(response)
}

async function main () {
  const prompt = ChatPromptTemplate.fromMessages([
    ['human', 'Tell me a short joke about {topic}']
  ])
  const outputParser = new StringOutputParser()

  const expert = RunnableSequence.from([
    prompt,
    new RunnableLambda({
      func: async (input: string) => {
        console.log(input)
        return 'dogs'
      }
    }).withConfig({ runName: 'contextRetriever' }),
    chatModel(),
    outputParser
  ])

  const response = await expert.invoke({ topic: 'cats' })
  console.log(response)
}

// npx ts-node src/lcel/retrieval_chain.ts
void main()
