import * as readline from 'readline'
import { research_gpt } from './research_gpt/research_gpt'
import dotenv from 'dotenv'
dotenv.config()

async function askQuestion (question: string): Promise<string> {
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

async function main () {
  console.log('\n***************** Welcome to the GPT Research Assistant *****************\n')

  const question = await askQuestion('O que você gostaria de pesquisar hoje? ')
  console.log(`query: ${question}!`)

  // get category

  // test clarification with a loop

  // send question along with clarification to research_gpt

  const response = await research_gpt.invoke(
    {
      question: `${question}`,
      context: 'medical'
    },
    {
      tags: ['abracadabra'],
      metadata: {
        description: 'dente de cabra'
      }
    })
  console.log('response', response)
}

// npx ts-node src/index.ts
void main()
