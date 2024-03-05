import { ChatAnthropic } from '@langchain/anthropic'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import dotenv from 'dotenv'

dotenv.config()

async function main () {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a world class technical documentation writer.'],
    ['user', '{input}']
  ])
  const outputParser = new StringOutputParser()
  const chatModel = new ChatAnthropic({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY
  })

  const llmChain = prompt.pipe(chatModel).pipe(outputParser)

  const answer = await llmChain.invoke({
    input: 'what is quantum physics?'
  })

  console.log(answer)
}

void main()
