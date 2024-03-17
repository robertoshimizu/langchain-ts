import { ChatOpenAI } from '@langchain/openai'
import dotenv from 'dotenv'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { AgentExecutor, type AgentStep } from 'langchain/agents'
import { DynamicTool } from '@langchain/core/tools'
import { convertToOpenAIFunction } from '@langchain/core/utils/function_calling'
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables'
import { OpenAIFunctionsAgentOutputParser } from 'langchain/agents/openai/output_parser'
import { formatToOpenAIFunctionMessages } from 'langchain/agents/format_scratchpad'
dotenv.config()

async function main () {
  const customTool = new DynamicTool({
    name: 'get_medicine_info',
    description: 'Returns information about medicine.',
    func: async (input: string) => `Provide more detailed information about the medicine: ${input}.`
  })

  const tools = [customTool]

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are very powerful medical assistant. You can provide information about medicine.'],
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad')
  ])

  const model = new ChatOpenAI({
    modelName: 'gpt-3.5-turbo-1106',
    temperature: 0,
    streaming: false
  })

  const modelWithFunctions = model.bind({
    functions: tools.map((tool) => convertToOpenAIFunction(tool))
  })

  const runnableAgent = RunnableSequence.from([
    {
      input: (i: { input: string, steps: AgentStep[] }) => i.input,
      agent_scratchpad: (i: { input: string, steps: AgentStep[] }) =>
        formatToOpenAIFunctionMessages(i.steps)
    },
    prompt,
    modelWithFunctions,
    new OpenAIFunctionsAgentOutputParser()
  ])

  const agentExecutor = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    tools
  }).withConfig({ runName: 'Agent' })

  // const response = await agentExecutor.invoke(
  //   {
  //     input: 'I would like information about Rosuvastatine.'
  //   }
  // )

  // console.log(response)

  const runnablesequence = RunnableSequence.from([
    {
      input: (i: { input: string, steps: AgentStep[] }) => i.input,
      agent_scratchpad: (i: { input: string, steps: AgentStep[] }) =>
        formatToOpenAIFunctionMessages(i.steps)
    },
    prompt,
    modelWithFunctions,
    new OpenAIFunctionsAgentOutputParser()
  ])

  const executor = AgentExecutor.fromAgentAndTools({
    agent: runnablesequence,
    tools,
    returnIntermediateSteps: true
  })

  const response2 = await executor.invoke(
    {
      input: 'I would like information about Rosuvastatine.'
    }
  )
  console.log(response2)
}

// npx ts-node src/preventive_task_force.ts
void main()
