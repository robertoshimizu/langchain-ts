import * as readline from 'readline'

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

  const name = await askQuestion('O que você gostaria de pesquisar hoje? ')
  console.log(`query: ${name}!`)
}

// npx ts-node src/index.ts
void main()
