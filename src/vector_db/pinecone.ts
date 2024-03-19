/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Pinecone } from '@pinecone-database/pinecone'
import { Document } from '@langchain/core/documents'
import { OpenAIEmbeddings } from '@langchain/openai'
import { PineconeStore } from '@langchain/pinecone'
import dotenv from 'dotenv'

dotenv.config()

// Instantiate a new Pinecone client, which will automatically read the
// env vars: PINECONE_API_KEY and PINECONE_ENVIRONMENT which come from
// the Pinecone dashboard at https://app.pinecone.io
async function pinecone() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!
  })

  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX!)

  const docs = [
    new Document({
      metadata: { foo: 'bar' },
      pageContent: 'pinecone is a vector db'
    }),
    new Document({
      metadata: { foo: 'bar' },
      pageContent: 'the quick brown fox jumped over the lazy dog'
    }),
    new Document({
      metadata: { baz: 'qux' },
      pageContent: 'lorem ipsum dolor sit amet'
    }),
    new Document({
      metadata: { baz: 'qux' },
      pageContent: 'pinecones are the woody fruiting body and of a pine tree'
    })
  ]

  await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings(), {
    pineconeIndex,
    maxConcurrency: 5 // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
  })
}

async function main() {
  await pinecone()
}
// npx ts-node src/vector_db/pinecone.ts
void main()
