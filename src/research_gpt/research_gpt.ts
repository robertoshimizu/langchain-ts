/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-multi-str */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { OpenAI } from '@langchain/openai'

import {
  RunnableLambda,
  RunnableSequence
} from '@langchain/core/runnables'
import { type Documento } from './entities'
import { summary_template } from './prompts'
import { getLinks, processLinks } from './getLinks'

export const research_gpt = RunnableSequence.from([
  new RunnableLambda({
    func: async (input: { question: string, context: string }) => {
      console.log('Test Context:', input.context)
      const links = await getLinks(input.question)
      const objs: Documento[] = links

      if (objs.length === 0) {
        console.log('No links found')
        return []
      }

      return objs.map(obj => {
        const newInput = {
          question: input.question,
          title: obj.pageContent.title,
          url: obj.pageContent.link,
          position: obj.pageContent.position
        }
        return newInput
      })
    }
  }).withConfig({ runName: 'addLinks' }),
  new RunnableLambda({
    func: processLinks
  }).withConfig({ runName: 'scrapePages' }),
  new RunnableLambda({
    func: async (scrapes: any) => {
      if (scrapes.length === 0) {
        console.log('No scrapes done')
        return null
      }
      // console.log('Summarizing pages ...')
      const summaries = await Promise.all(
        scrapes.map(async (scrape: any) => {
          const formattedPrompt = await summary_template.format({
            text: scrape.text,
            question: scrape.question
          })
          const llm = new OpenAI({
            modelName: 'gpt-3.5-turbo-1106',
            temperature: 0.0
          }).withConfig({ runName: 'summarize article' })
          const summary = await llm.invoke(formattedPrompt)
          return {
            summary,
            url: scrape.url,
            title: scrape.title
          }
        })
      )
      const flattenedObject = summaries.reduce((acc, item, index) => {
        acc[
          `Summary_${index + 1}`
        ] = `Source URL: ${item.url}  Title:${item.title}  >> \nSummary: ${item.summary}`
        return acc
      }, {})
      // console.log('flattenedObject', flattenedObject)
      return {
        research_summary: flattenedObject,
        question: scrapes[0].question
      }
    }
  }).withConfig({ runName: 'sumarizeScrapes' })
]).withConfig(
  {
    runName: 'research_gpt' ,
    tags: ['research_gpt'],
    metadata: {
      description: 'This runnable is used to get links from the web and summarize the content of the links'
    }
  })
