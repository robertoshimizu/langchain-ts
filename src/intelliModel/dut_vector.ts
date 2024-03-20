/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOpenAI, OpenAIChatInput } from '@langchain/openai'
import dotenv from 'dotenv'
import {
  ChatPromptTemplate,
  MessagesPlaceholder
} from '@langchain/core/prompts'
import { AgentExecutor, type AgentStep } from 'langchain/agents'
import { DynamicTool } from '@langchain/core/tools'
import { convertToOpenAIFunction } from '@langchain/core/utils/function_calling'
import {
  RunnablePassthrough,
  RunnableSequence
} from '@langchain/core/runnables'
import { OpenAIFunctionsAgentOutputParser } from 'langchain/agents/openai/output_parser'
import { formatToOpenAIFunctionMessages } from 'langchain/agents/format_scratchpad'

import { StringOutputParser } from '@langchain/core/output_parsers'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { Document } from 'langchain/document'
import * as fs from 'fs'
import { promises as fsPromises } from 'fs'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import OpenAI from 'openai'
dotenv.config()

// Regex para identificar o início de cada procedimento
const procedureRegex = /\n\d+\.\s[^;]+/g

// Regex para identificar subitens dentro de cada procedimento
const subitemRegex = /(?:\n\d+|\n[a-z])\.\s[^;]+/g

// Função para extrair procedimentos e seus subitens
function extractProcedures(text: string) {
  const procedures = []
  let match

  while ((match = procedureRegex.exec(text)) !== null) {
    // Inclui o título do procedimento
    const procedure = { title: match[0].trim(), subitems: [] as string[] }

    // Limita a busca de subitens ao próximo procedimento
    const startIndex = match.index
    const nextProcedureMatch = procedureRegex.exec(text)
    const endIndex = nextProcedureMatch ? nextProcedureMatch.index : text.length
    const procedureText = text.slice(startIndex, endIndex)

    // Extrai os subitens
    let subitemMatch
    while ((subitemMatch = subitemRegex.exec(procedureText)) !== null) {
      procedure.subitems.push(subitemMatch[0].trim())
    }

    procedures.push(procedure)
  }

  return procedures
}

async function maine() {
  const filePath = 'mytext.txt'
  // Read the content of the file
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err)
      return
    }

    // Assuming we are now processing the data and not just logging it
    // You can now split the data or process as required

    // For example, split the content by the asterisk delimiter
    const sections = data
      .split('************************************')
      .filter((section) => section.trim() !== '')

    // Here you would write each section to a file or process it further
    // This is just an example to print out the number of sections
    console.log(`The file has been split into ${sections.length} sections.`)

    // If you need to check the content of a section without printing to console,
    // you could write the content to a new text file to inspect it
    sections.forEach((section, index) => {
      const outputFilePath = `section_${index + 1}.txt`
      fs.writeFile(outputFilePath, section, 'utf8', (writeErr) => {
        if (writeErr) {
          console.error(`Error writing section ${index + 1} to file:`, writeErr)
        } else {
          console.log(`Section ${index + 1} written to ${outputFilePath}`)
        }
      })
    })
  })
}

async function readFileAsync(path: string) {
  try {
    const data = await fsPromises.readFile(path, 'utf8')
    console.log('File content read successfully.')
    return data.replace(/\r/g, '')
  } catch (err) {
    console.error('Error reading file:', err)
  }
}

async function textLoader(filePath: string) {
  const loader = new TextLoader(filePath)
  const docs = await loader.load()

  return docs
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Você deve analisar a diretriz de utilizacao de cobertura de saude fornecida e extrair as seguintes metadados essenciais:

            - numero: numero da DUT: number
            - nome: titulo completo da cobertura: string
            - indicacoes: list de sintomas ou condicao clinica do paciente específicos que justificam a cobertura do procedimento: string[]
            - metodo: lista de métodos ou tecnologias específicos aplicados no procedimento: string[]
          
            Apresente os metadados extraídos em formato JSON, seguindo este modelo para cada procedimento.         
            Assegure-se de que as informacoes de indicacoes e metodo sejam concisas e precisas, capturando apenas as informações essenciais. 
            O valores de indicacoes e metodos devem ser obrigatoriamente lista de strings.
            Ignore detalhes que não se encaixem nos três metadados solicitados.`
  ],
  ['user', '{input}']
])

const llmChain = () => {
  const chatModel = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo-0125',
    temperature: 0.0
  }).bind({
    response_format: { type: 'json_object' }
  })
  const outputParser = new StringOutputParser()

  return prompt.pipe(chatModel).pipe(outputParser)
}

interface MetaDut {
  numero: number
  nome: string
  indicacoes: string[]
  metodo: string[]
}

async function text2Doc(fileDir: any) {
  let docs = []

  for (let i = 1; i < 6; i++) {
    const docs = await textLoader(`${fileDir}/section_${i}.txt`)
    const doc = docs[0]
    doc.pageContent = doc.pageContent.replace(/\r/g, '')
    const meta = await llmChain().invoke({ input: doc.pageContent })
    doc.metadata = JSON.parse(meta.replace(/\r/g, ''))
    const metaDut = doc.metadata as MetaDut
    console.log(metaDut)
  }
}

async function main() {
  console.log('Starting...')
  await text2Doc('src/documents')
}
// npx ts-node src/intelliModel/dut_vector.ts
void main()
