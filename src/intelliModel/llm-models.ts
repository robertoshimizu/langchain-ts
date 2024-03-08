/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
import OpenAI from 'openai'
import {
  getAntibioticInformation,
  getDifferentialDiagnosis,
  getDiseaseInformation,
  getEmergencyGuidance,
  getGenericPrompt,
  getMedicalArticles,
  getMedicineInformation,
  getPatientEducation,
  getSignsAndSymptoms,
  getTreatmentInformation,
  getMedicationsInteractions,
  getTravelMedicalAdvice,
  getGeneralMedicalQueries
} from './llm-functions'
import dotenv from 'dotenv'
dotenv.config()

export const runtime = 'edge'

interface InputObject {
  role: 'user' | 'assistant' | 'system' | 'function'
  content: string
}

interface OutputObject {
  input: Array<{
    content: string
    type: 'human' | 'ai' | 'system' | 'function'
  }>
  config: Record<string, unknown>
  kwargs: Record<string, unknown>
}

// This function is used to adapt the input array of messages to the format expected by the AI API.
// So it carries all the messages outstanding in the conversation.
// At some point it may exceed the max size of tokens allowed by model.
function adaptObjectsWithMemory (inputArray: InputObject[]): OutputObject {
  const output = inputArray.map(item => {
    let type: 'human' | 'ai' | 'system' | 'function'
    switch (item.role) {
      case 'user':
        type = 'human'
        break
      case 'assistant':
        type = 'ai'
        break
      case 'system':
        type = 'system'
        break
      case 'function':
        type = 'function'
        break
      default:
        throw new Error(`Unknown role: ${String(item.role)}`)
    }
    return { content: item.content, type }
  })

  return {
    input: output,
    config: {},
    kwargs: {}
  }
}

// This function is used to adapt the last message to the format expected by the AI API.
// So it carries only the last message in the conversation.
// It leaves to the python backend to manage the memory of the conversation.
export function adaptObjectsNoMemory (
  inputArray: InputObject[]
): Record<string, any> {
  let mostRecentHumanMessage = null
  for (let i = inputArray.length - 1; i >= 0; i--) {
    if (inputArray[i].role === 'user') {
      mostRecentHumanMessage = { content: inputArray[i].content, type: 'human' }
      break
    }
  }

  if (!mostRecentHumanMessage) {
    throw new Error('No human (user) type message found in the input array')
  }

  return {
    input: [mostRecentHumanMessage],
    config: {},
    kwargs: {}
  }
}

// Example usage
const input = [
  { role: 'user', content: 'ola' },
  { role: 'assistant', content: 'Olá! Como posso ajudar você hoje?' },
  { role: 'user', content: 'Conte uma piada' }
]

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface ChatOptions {
  locale?: string // Required
  messages: any[] // Required
  model?: string // Optional with default value
  stream?: boolean // Optional with default value
  functions?: any[] // Optional with default value
  topic?: any
}

export interface IChatService {
  createChat: (options: ChatOptions) => Promise<any>
  simpleChat: (options: ChatOptions) => Promise<any>
}

function inspectAndExtractAgent (output: string): string | null {
  try {
    // Try to parse the output as JSON
    const parsedOutput = JSON.parse(output)

    // Check if the parsed object has the "agent" property
    if (
      typeof parsedOutput === 'object' &&
      parsedOutput !== null &&
      'agent' in parsedOutput
    ) {
      return parsedOutput
    }

    // If parsing is successful but there's no "agent" key, return null or some default value
    return null
  } catch (e) {
    // If JSON.parse() throws an error, the output is not a valid JSON string
    console.error('Output is not a valid JSON string:', output)

    // Return null or handle the case as needed (e.g., log an error or return a default value)
    return output
  }
}

export class OpenAIChatService implements IChatService {
  async createChat (options: ChatOptions): Promise<any> {
    // Set default values
    const language = 'English'

    const language_prompt = `Answer in language: ${language}, unless user messages are written in another language. If so, follow user's language.`
    let {
      messages,
      model = 'gpt-4-1106-preview',
      stream = true,
      functions, // No default value, it remains undefined if not provided,
      topic
    } = options

    let completions_params: any

    // Add the system message to the beginning of the messages
    const system_me = getGenericPrompt(0)

    messages = [
      system_me,
      { role: 'system', content: language_prompt },
      ...messages
    ]

    let func: any

    if (topic.agent === 'medicine') {
      switch (topic.sub_topic) {
        case 'medications':
          func = 'getMedicineInformation'
          break
        case 'differential_diagnosis':
          func = 'getDifferentialDiagnosis'
          break
        case 'medications_interactions':
          func = 'getMedicationsInteractions'
          break
        case 'diseases':
          func = 'getDiseaseInformation'
          break
        case 'treatments':
          func = 'getTreatmentInformation'
          break
        case 'travellers_health':
          func = 'getTravelMedicalAdvice'
          break
        case 'emergency_guide':
          func = 'getEmergencyGuidance'
          break
        case 'medical_articles':
          func = 'getMedicalArticles'
          break
        default:
          // console.log('Caiu no generico')
          func = 'getGeneralMedicalQueries'
      }

      // Brute force to use the right function in the next llm call

      completions_params = {
        model,
        stream,
        messages,
        seed: 42,
        temperature: 0.0,
        functions,
        function_call: { name: func }
      }
    } else {
      completions_params = {
        model,
        stream,
        messages,
        seed: 42,
        temperature: 0.0,
        functions
      }
    }

    // console.log('Calling the createChat API in language: ', language)
    // Call the API

    try {
      const res = await openai.chat.completions.create(completions_params)

      // console.log('chat.completions chamado com sucesso!!')

      return res
    } catch (error) {
      console.error('Erro na primeira chamada: ', error)

      return 'Houve um erro ao criar o chat. Experimente dar um "refresh" na página.'
    }
  }

  // DETERMINAR O TOPICO -> MEDICINA
  async simpleChat (options: ChatOptions): Promise<any> {
    const { messages, model = 'gpt-4' } = options

    const adapt_messages = [getGenericPrompt(13), ...messages]

    try {
      const res = await openai.chat.completions.create({
        model,
        messages: adapt_messages,
        seed: 42,
        temperature: 0.0
      })

      // console.log('simple chat chamado com sucesso')
      // @ts-expect-error
      return inspectAndExtractAgent(res.choices[0].message.content)
    } catch (error) {
      console.error('Erro simple chat: ', error)
    }
  }
}

export interface ICompletionService {
  createCompletion: (prompt: string) => Promise<any>
}

export class OpenAICompletionService implements ICompletionService {
  async createCompletion (prompt: any): Promise<any> {
    // Set default values
    const language_prompt = 'Keep answering in the language that the user had initiated the conversation.'
    const model = 'gpt-4'
    console.log(
      'Calling the createCompletion in language because a function was called.'
    )

    // Call the API

    const completion = await openai.chat.completions.create({
      temperature: 0.0,
      messages: [
        {
          role: 'system',
          content: language_prompt
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model
    })

    return completion.choices[0].message.content
  }
}

export async function getPromptAndModelForFunctionCall (
  name: string,
  args: any,
  data: any
): Promise<{ prompt: any, model: string }> {
  let prompt
  let model = 'gpt-3.5-turbo-1106' // Default model

  switch (name) {
    case 'getMedicineInformation':
      console.log(
        'Using function getMedicineInformation with argument:',
        args.nameOfMedicine,
        args.contextOfQuestion
      )
      prompt = await getMedicineInformation(
        args.nameOfMedicine as string,
        args.contextOfQuestion as string
      )
      model = 'gpt-4-1106-preview'
      break
    case 'getMedicationsInteractions':
      console.log(
        'Using function getMedicationsInteractionss with the following names:',
        args.nameOfMedications,
        args.contextOfQuestion
      )
      prompt = await getMedicationsInteractions(
        args.nameOfMedications,
        args.contextOfQuestion as string
      )
      model = 'gpt-4-1106-preview'
      break
    case 'getTreatmentInformation':
      console.log(
        'Using function getTreatmentInformation with the following names:',
        args.nameOfDisease,
        args.contextOfQuestion
      )
      prompt = await getTreatmentInformation(
        args.nameOfDisease,
        args.contextOfQuestion as string
      )
      model = 'gpt-4-1106-preview'
      break
    case 'getDifferentialDiagnosis':
      console.log(
        'Using function getDifferentialDiagnosis with the following symptoms:',
        args.hypothesis
      )
      prompt = await getDifferentialDiagnosis(
        args.symptoms,
        args.hypothesis,
        args.related_questions,
        args.confirmation_questions
      )
      model = 'gpt-4-1106-preview'
      break
    case 'getDiseaseInformation':
      console.log(
        'Using function getDiseaseInformation with the following disease:',
        args.nameOfDisease,
        args.contextOfQuestion
      )
      prompt = await getDiseaseInformation(
        args.nameOfDisease,
        args.contextOfQuestion as string
      )
      model = 'gpt-4-1106-preview'
      break
    case 'getAntibioticInformation':
      console.log(
        'Using function getAntibioticInformation with the following symptoms:',
        args.symptoms
      )
      prompt = await getAntibioticInformation(args.symptoms)
      model = 'gpt-4-1106-preview'
      break
    case 'getPatientEducation':
      console.log(
        'Using function getPatientEducation with the following health problem:',
        args.nomeProblemaSaude
      )
      prompt = getPatientEducation(args.nomeProblemaSaude)
      model = 'gpt-4-1106-preview'
      break
    case 'getSignsAndSymptoms':
      console.log(
        'Using function getSignsAndSymptoms with the following signs and symptoms:',
        args.signsAndsymptoms,
        args.contextOfQuestion
      )
      prompt = await getSignsAndSymptoms(
        args.signsAndsymptoms,
        args.contextOfQuestion as string
      )
      model = 'gpt-4-1106-preview'
      break
    case 'getMedicalArticles':
      console.log(
        'Using function getMedicalArticles with the following topic:',
        args.nameOfTopic,
        args.contextOfQuestion,
        args.askedForArticles
      )

      prompt = await getMedicalArticles(
        args.nameOfTopic,
        args.contextOfQuestion as string,
        args.askedForArticles as boolean
      )
      model = 'gpt-4-1106-preview'
      break
    case 'getTravelMedicalAdvice':
      console.log(
        'Using function getTravelMedicalAdvice with the following destination:',
        args.travelDestination
      )
      prompt = await getTravelMedicalAdvice(args.travelDestination)
      model = 'gpt-4-1106-preview'
      break
    case 'getEmergencyGuidance':
      console.log(
        'Using function getEmergencyGuidance with the following urgent case:',
        args.nameOfEmergency
      )
      prompt = getEmergencyGuidance(args.nameOfEmergency)
      model = 'gpt-4-1106-preview'
      break

    case 'getGeneralMedicalQueries':
      console.log(
        'Using function getGeneralMedicalQueries with the following variables:',
        args.understanding,
        args.related_questions
      )
      model = 'gpt-4-1106-preview'
      prompt = await getGeneralMedicalQueries(args.understanding, args.related_questions)
      break
    default:
      console.log('No function used')
      return { prompt: null, model }
  }

  return { prompt, model }
}
