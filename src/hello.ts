import add from './lib/addi'

// npx ts-node src/hello.ts
const message: string = 'Hello, TypeScript!'
const res = add(1, 2)
console.log(message, res)
