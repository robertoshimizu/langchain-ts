import { ChatAnthropic } from '@langchain/anthropic'
import dotenv from 'dotenv'

dotenv.config()

async function main () {
  const chatModel = new ChatAnthropic({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY
  })

  const answer = await chatModel.invoke('what is LangSmith?')

  console.log(answer)
}

void main()
