# Design Patterns in Typescript

## Strategy Pattern

Scenario: inheritance. Have an abstract class `Duck` and any type of Duck: Mallard Duck, Redhead Duck, implements it, and therefore inherits the behaviors: quack, swim and display.

Problems: 
- what if some type of ducks have behaviors that are not common to all ducks? For example, if we define a `fly()` method in the parent class, all subclasses will inherit the fly(), but `not all ducks can fly`. `Rubber Ducks` don't fly nor quack, but they `squeak`.

Solutions:
- override the fly() and quack() methods at the subclass implementation?
- implement specific behaviors to specific type of ducks, for example, `squeak()` in the Rubber duck subclass implementation.

Impacts:
- Need to track all duck behaviors and implement them separately.
- If another behavior is added or resumed, need to go individually to all subclasses and change it. If `changes are frequent`, then this becomes cumbersome.

> ### #1 Design Principle: Identify the aspects of your application that vary and separate them from what stays the same.

If you've got some aspect of your code that is changing, say with every new requirement, then you know you've got a `behavior` that needs to be pulled out and separated from all the stuff that doesn't change. Take the parts that vary and **encapsulate** them, so later you can alter or extend the part that varies without affecting those that do not.

In the example, separate out `Fly` and `Quack` methods, and create a new set of classes that represent each behavior.

> ### #2 Design Principle: Program to an interface, not an implementation.


# TDD
Test-Driven Development (TDD) is a software development methodology in which tests are written before the code itself, ensuring that the code meets the desired requirements and behaves as expected. In TDD, developers create automated tests to check the functionality of their code before implementing it. This approach helps catch bugs early, improve code quality, and facilitate code refactoring.

In TDD, several terms are used to describe different testing components and techniques. Here is a panorama of the key terms:

1. Unit Test: A type of test that focuses on a single unit of code, usually a function or a method, to ensure it works correctly in isolation.

2. Integration Test: A test that focuses on the interaction between multiple units of code, such as classes or modules, to ensure they work correctly together.

3. Spies: Test spies are functions that record how other functions are called, including their arguments, return values, and the number of times they were called. Spies can be used to verify that a function has been called with the correct arguments or a specific number of times.

4. Stubs: Stubs are functions or objects that replace real implementations with predefined behavior. They are used to isolate the unit of code being tested from its dependencies, allowing developers to test a single unit without worrying about the behavior of external dependencies.

5. Mocks: Mocks are a more advanced form of stubs. They are objects or functions that mimic the behavior of real objects or functions but also include built-in expectations about how they should be used, such as the number of times a function should be called or the arguments it should receive. If a mock's expectations are not met, the test fails.

6. Fakes: Fakes are lightweight implementations of objects or functions that replace the real ones during testing. They are typically simpler than the actual implementations and can be used to test complex scenarios without incurring the overhead of using real objects or functions.

7. Test Doubles: A general term for any test object that replaces a real object during testing, including spies, stubs, mocks, and fakes.

8. Test Suite: A collection of test cases or test scenarios designed to test a specific component or functionality of an application.

9. Test Runner: A tool or framework that automates the process of executing tests and reporting the results.

10. Test Fixture: A fixed environment or setup used to consistently run tests. This may include setting up database connections, creating objects, or configuring other necessary resources.

11. Continuous Integration (CI): A development practice that involves automatically building, testing, and merging code changes into a shared repository to detect and fix integration issues as early as possible.

These terms represent some of the core concepts in Test-Driven Development. Understanding them can help you better navigate TDD practices and improve the quality of your code.

>`SUT` stands for System Under Test. It refers to the specific component, module, function, or class being tested in a given test case. The SUT is the primary focus of a test, and the goal is to ensure that it meets the expected requirements and behaves correctly in various scenarios.

In Test-Driven Development (TDD), developers write tests that specifically target the SUT, often isolating it from external dependencies using test doubles like stubs or mocks. By focusing on the SUT, developers can ensure that individual units of code are working correctly before integrating them with other components.

In summary, the SUT is the main subject of a test, and its purpose is to verify the correctness and proper behavior of the component under examination.

## Typescript and Jest Boilerplate

This is a starter template for a TypeScript project in Visual Studio Code, using `pnpm` as the package manager and `tsc-watch` for automatic compilation and running.

[![js-standard-style](https://cdn.rawgit.com/standard/standard/master/badge.svg)](http://standardjs.com)

## Installation

1. Clone this repository to your local machine.
2. Install `pnpm` globally by running the following command in your terminal:

```
npm install -g pnpm
```

3. Install project dependencies by running the following command in your terminal:

```
pnpm install
```

## Usage

To start the project, run the following command in your terminal:

```
pnpm run start:watch
```

This will start the project in watch mode, which will automatically recompile and run the code whenever you make changes to the TypeScript files.

To compile the code without running it, run the following command in your terminal:

```
pnpm run build
```

This will compile the TypeScript code to JavaScript and output the result to a new folder called `dist`.

To run the compiled JavaScript code, run the following command in your terminal:

```
pnpm run start
```

## Configuration

### TypeScript

The configuration for TypeScript is located in the `tsconfig.json` file. You can modify this file to change the compiler options for your project.

```json
{
  "compilerOptions": {
    "target": "ES2022", // Check node.green to select the most up-to-date ecma script version
    "module": "commonjs", // will convert to commonjs
    "outDir": "./dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true, // will work with require and import
    "allowJs": true // allow javascript files
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts"]
}
```

### Linter

Use the JavaScript Standard Style - https://standardjs.com/ . We will configure it along with eslinter - https://eslint.org/

For that there is a wrapper at https://github.com/standard/eslint-config-standard-with-typescript

```bash
pnpm install eslint-config-standard-with-typescript
```
#### Update Settings to:
```
"editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": false,
```

## Jest

```bash
pnpm install -D jest @types/jest ts-jest
```
Jest Config
```
module.exports = {
  roots: ['<rootDir>/src'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  transform: {
    '.+\\.ts$': 'ts-jest'
  }
}
```

To run:
```
pnpm test
```
But I can have several scripts to run tests, at `package.json`:
```json
"scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "watch": "pnpx tsc-watch --onSuccess \"node dist/index.js\"",
    "test": "jest --passWithNoTests",
        "test:unit":"pnpm test -- --silent --noStackTrace -c jest-unit-config.js",
    "test:watch": "pnpm test:unit -- --watch",
    "format": "npx prettier '**/*.ts' '**/*.js' --write"
  },
```

I can have a specific script and config only for `unit tests`:

Jest-Unit-Config
```
const config = require('./jest.config.js')
config.testMatch = ['**/*.spec.ts']
module.exports = config
```
So in this project, unit tests are ran when they have the suffix `spec`

More configurations: `clean-node-api Manguinho - aula 11`


### Transpile and run (watch mode)

The configuration for `tsc-watch` is located in the `tsconfig.json` file as well. You can modify this file to change the options for the `tsc-watch` compiler.

But here we run through the script
```
pnpm build
pnpm watch
pnpm start
```

### Run files individually

The scripts in `package.json` runs the application staring from `index.ts`. If you want to run any `.ts` file, use `ts-node`. With `ts-node`, you can run TypeScript files directly. `ts-node` is a TypeScript execution environment that allows you to run TypeScript files directly without the need to manually compile them to JavaScript first.

```bash
npx pnpm install --save-dev ts-node
```
And execute by:

```bash
npx ts-node src/myFile.ts
```

`ts-node` uses the settings from your `tsconfig.json` file by default. It reads the TypeScript configuration from the `tsconfig.json` file in your project's directory and uses those settings to transpile and run your TypeScript files. This means that it will respect the compiler options, module resolution settings, and other configuration settings specified in your `tsconfig.json` file.

## Langchain
when using langchain need to change the config. `npx tsc` to use `tsconfig.json`
```bash
npx tsc
node dist/index.js
```
It compiles with errors, but it works.

## Git

### Amend: Add a commit to the last one

```bash
git add .
git commit --amend --no-edit
```

## Ways to prototype ideias in Typescript when it has async functions:

1. Use of an asynchronous IIFE (Immediately Invoked Function Expression)

```javascript
import { config } from 'dotenv'
import { getJson } from 'serpapi'

// Load environment variables from .env file
config()

void (async () => {
  try {
    const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY // Load API key from environment variable
    if (SERPAPI_API_KEY == null) {
      throw new Error('API_KEY is not set in the environment variables.')
    }

    const response = await getJson({
      engine: 'google',
      api_key: SERPAPI_API_KEY,
      q: 'coffee',
      location: 'Austin, Texas'
    })

    console.log(response)
  } catch (error) {
    console.error('Error:', error)
  }
})()
```

2. Modularize the Asynchronous Code
Another approach is to move the asynchronous code into a separate async function and then call that function using the void operator.

```javascript
import { config } from 'dotenv'
import { getJson } from 'serpapi'

// Load environment variables from .env file
config()

async function main() {
  try {
    const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY // Load API key from environment variable
    if (SERPAPI_API_KEY == null) {
      throw new Error('API_KEY is not set in the environment variables.')
    }

    const response = await getJson({
      engine: 'google',
      api_key: SERPAPI_API_KEY,
      q: 'coffee',
      location: 'Austin, Texas'
    })

    console.log(response)
  } catch (error) {
    console.error('Error:', error)
  }
}

void main();
```

## Persist data

```typescript

// Usage
const docManager = new DocumentManager('documents.json');

// Creating a new document
docManager.create({
  pageContent: '...',
  metadata: { ... }
});

// Reading a document
console.log(docManager.read(0));

// Updating a document
docManager.update(0, {
  pageContent: 'new content',
  metadata: { ... }
});

// Deleting a document
docManager.delete(0);

// Getting all documents
console.log(docManager.getAllDocuments());

```

## LCEL in Typescript

#### RunnablePassthrough

```typescript
const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a personal assistant.'],
    ['user', 'This is my question: {question}']
  ])

  const chain = RunnableSequence.from([
    new RunnablePassthrough().assign({
      context: () => 'conexto do lcel'
    }

    ).withConfig({ runName: 'add context' }),
    prompt
  ])

  const res = await chain.invoke({ question: 'What is the efficacy of rosuvastatin in heart attack prevention?' })
  console.log(res)


```

#### RunnableLambda

```typescript
const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a personal assistant.'],
    ['user', 'This is my question: {question}']
  ])

  const chain = RunnableSequence.from([
    new RunnablePassthrough().assign({
      context: () => 'conexto do lcel'
    }).withConfig({ runName: 'add context' }),
    new RunnableLambda({
      func: (input: string) => {
        console.log('input', input.question)
        const newInput = {
          question: 'Qual a eficacia do rosuvastatina na prevencao de ataque cardiaco?',
          context: 'questao traduzida para portugues'
        }
        return newInput
      }
    }).withConfig({ runName: 'contextRetriever' }),
    prompt
  ])

  const res = await chain.invoke({ question: 'What is the efficacy of rosuvastatin in heart attack prevention?' })
  console.log(res)


```

## ResearchGPT - indentify topic first

Run a quick and basic chat completion to detect the topic and the intent of the question.
Build a decision tree to select prompts
json {
  topic
  intent of question / want to know what?
}


## Using fetch

endpoint:
Langserve
`'http://localhost:8000/openai/invoke' `
payload:
```
{
    "input": [
        {
            "content": "que eh Jack Sparrow?",
            "type": "human"
        }
    ],
    "config": {}
}
```
Output: 
```
{
  "output": {
    "content": "Jack Sparrow es un personaje ficticio y el protagonista de la serie de películas de \"Piratas del Caribe\". Es interpretado por el actor Johnny Depp. Sparrow es un carismático y excéntrico pirata, conocido por su estilo de vestir extravagante, su andar peculiar y su ingenio para salir de situaciones peligrosas. A lo largo de las películas, se embarca en diversas aventuras en busca de tesoros y enfrentándose a enemigos como el Capitán Barbossa y Davy Jones.",
    "additional_kwargs": {},
    "type": "ai",
    "example": false
  },
  "callback_events": [],
  "metadata": {
    "run_id": "1ba06d38-a562-480d-aac0-b3fc56e5c740"
  }
}
```

# Models with No Memory

The api `chat-with-fastapi` converses with the `intelli_server` langserve back end.
It deals with the most basic endpoint:

```python
add_routes(
    app,
    ChatOpenAI(),
    path="/openai",
)
```

The `messages` object in the `useChat`, contains all outstanding messages, and it contains memory. However, it consumes too much tokens, and it eventually exceeds the token limit size of the LLM model. 
So, there is a variant, that adatps and sends only the last message, so the python backend then needs to manage it. For that, the end point is `path="/openai-with-tools"`, where we also add functions.

# Comments

Fetch from fastapi is good for basic chat completions. However, when working with langchain's agent-executor or openai chat with functions, it does not stream. Because of the intermediate function call.
It seems that Vercel AI SDK has this feature better resolved, therefore, it has decided to carry on with vercel/typescript.
Potentially we can make an API server, exposing the `api/routes.ts`. Need to test it in postman. And then see how we can add security and a swagger.

Nevertheless, we can add some python serverless functions in next.js/vercel.
https://vercel.com/docs/functions/serverless-functions/runtimes/python

# Requirements


1. Agnostic to LLM Models. 
2. Common interface. Today, the parser is beskpoke to `ChatOpenAI()` output. But it must be common to all, `ChatAnthropic()`, etc
3. It would be nice to receive stream of `intermediate steps` to let customer knowing what is happening




## License

This project is licensed under the MIT License. See the LICENSE file for more information.
