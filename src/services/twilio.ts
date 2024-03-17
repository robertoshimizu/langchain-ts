/* eslint-disable @typescript-eslint/space-before-function-paren */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/indent */
import Twilio from 'twilio'
import dotenv from 'dotenv'
import * as readline from 'readline'
dotenv.config()

const client = Twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
)
const verifySid = 'VAf4cf213e00095403de265ab4748c3d14'
async function createTwilioVerificationService(phoneNumber: any) {
    try {
        const verificationCheck = await client.verify.v2
            .services(verifySid)
            .verifications.create({ to: phoneNumber, channel: 'sms' })
        console.log(verificationCheck.status)

        return verificationCheck
    } catch (error) {
        console.error(error)
    }
}

async function verifyTwilioOtp(phoneNumber: string, otpCode: string) {
    try {
        const verificationCheck = await client.verify.v2
            .services(verifySid)
            .verificationChecks.create({ to: phoneNumber, code: otpCode })
        return verificationCheck
    } catch (error) {
        console.error(error)
    }
}

async function askQuestion(question: string): Promise<string> {
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

async function main() {
    const createService = await createTwilioVerificationService(
        '+5511974839339'
    )
    const otp = await askQuestion(
        'Espere e digite o numero de Otp recebido por SMS:'
    )
    console.log('Otp:', otp)

    // const HTC = await runResearchGpt(question)

    const verifyService = await verifyTwilioOtp('+5511974839339', otp)
    console.log(verifyService)
}

// npx ts-node src/services/twilio.ts
void main()
