/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import * as readline from 'readline'
import OpenAI from 'openai'
import { research_gpt } from './research_gpt/research_gpt'
import dotenv from 'dotenv'
import { getMedicalArticles } from './pubmed/pubmed_articles'
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

async function runResearchGpt (question: any) {
  console.log('\n***************** Welcome to the GPT Research Assistant *****************\n')
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

  const prompt = `Your goal here is to provide an evidence-based evaluation of the efficacy of a specific health technology. The assessment should be grounded in systematic reviews and meta-analyses, with special emphasis on high-quality studies, such as Cochrane systematic reviews and reviews based on high-quality randomized controlled trials. \
       Step 1: Identification of the Health Technology: 
          - Briefly describe the health technology to be evaluated; 
          - Specify the clinical context or application of the technology.
       Step 2: Analysis of Systematic Review Abstracts: 
         - You will receive a selection of abstracts from systematic reviews related to the health technology in question; 
          - Analyze each abstract, identifying and prioritizing the following sources: 1) Cochrane systematic reviews, known for their rigorous methodology and relevance; 2) Reviews based on high-quality randomized controlled trials, indicating superior methodological robustness.
          - Focus on evaluating the methodological quality, main results, and conclusions presented in the abstracts, especially those from highly reliable sources. \
        Step 3: Data Evaluation: Summarize the main findings of the systematic reviews, highlighting: 1) The methodological quality of the reviews; 2) The principal results and conclusions regarding the efficacy of the technology; 3) Any variation in the results that may impact the interpretation of efficacy. \
        Step 4: Synthesis and Recommendations: 
           - Based on the collected data, provide a critical synthesis, evaluating the efficacy of the health technology.
           - Highlight whether the technology is cost-effective, considering the clinical benefits relative to costs.
           - Provide practical recommendations for health managers, indicating whether the technology should be adopted, monitored, or reevaluated.
        Conclusion: 
           - Present a concise conclusion on the health technology assessment, based on the evidence found.
          - Indicate any gaps in the literature and suggest areas for future research.

        In your response you MUST refer to each abstract as its title or source and 
        include a superscript number or parentheses that link directly 
        to number listed in the Reference section, detailed next.

        YOU must at the end of the response, provide a "References" section with the 
        full citation details for the source, including the name of the source and full clickable url. 
        Make sure to not add duplicated sources, but only one reference for each.
          
          abstracts """${JSON.stringify(response?.research_summary)}"""`

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  const res = await openai.chat.completions.create({
    model: 'gpt-4-1106-preview',
    messages: [{ role: 'user', content: prompt }],
    seed: 42,
    temperature: 0.0
  })

  console.log('res', res.choices[0].message.content)
  return res.choices[0].message.content
}

async function main () {
  const question = await askQuestion('O que você gostaria de pesquisar hoje? ')
  console.log(`query: ${question}!`)

  // const HTC = await runResearchGpt(question)

  await getMedicalArticles(question)
}

// npx ts-node src/index.ts
void main()
