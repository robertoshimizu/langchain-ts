import { ChatOpenAI } from '@langchain/openai'
import dotenv from 'dotenv'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { AgentExecutor, type AgentStep } from 'langchain/agents'
import { DynamicTool } from '@langchain/core/tools'
import { convertToOpenAIFunction } from '@langchain/core/utils/function_calling'
import { RunnableSequence } from '@langchain/core/runnables'
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
    streaming: true
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
  // const input = 'I would like information about Ozempic.'
  // console.log(`Calling agent executor with query: ${input}`)

  // const stream = await executor.stream({
  //   input
  // })

  // for await (const chunk of stream) {
  //   console.log(JSON.stringify(chunk, null, 2))
  //   console.log('------')
  // }
  const eventStream = agentExecutor.streamEvents(
    {
      input: 'I would like information about Rosuvastatine.'
    },
    { version: 'v1' }
  )

  for await (const event of eventStream) {
    const eventType = event.event
    if (eventType === 'on_chain_start') {
    // Was assigned when creating the agent with `.withConfig({"runName": "Agent"})` above
      if (event.name === 'Agent') {
        console.log('\n-----')
        console.log(
        `Starting agent: ${event.name} with input: ${JSON.stringify(
          event.data.input
        )}`
        )
      }
    } else if (eventType === 'on_chain_end') {
    // Was assigned when creating the agent with `.withConfig({"runName": "Agent"})` above
      if (event.name === 'Agent') {
        console.log('\n-----')
        console.log(`Finished agent: ${event.name}\n`)
        console.log(`Agent output was: ${event.data.output}`)
        console.log('\n-----')
      }
    } else if (eventType === 'on_llm_stream') {
      const content = event.data?.chunk?.message?.content
      // Empty content in the context of OpenAI means
      // that the model is asking for a tool to be invoked via function call.
      // So we only print non-empty content
      if (content !== undefined && content !== '') {
        console.log(`| ${content}`)
      }
    } else if (eventType === 'on_tool_start') {
      console.log('\n-----')
      console.log(
      `Starting tool: ${event.name} with inputs: ${event.data.input}`
      )
    } else if (eventType === 'on_tool_end') {
      console.log('\n-----')
      console.log(`Finished tool: ${event.name}\n`)
      console.log(`Tool output was: ${event.data.output}`)
      console.log('\n-----')
    }
  }
}

// npx ts-node src/lcel/agents_stream.ts
void main()
