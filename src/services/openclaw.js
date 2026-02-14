import OpenAI from 'openai'
import logger from '../utilities/logger.js'

const { OPENCLAW_GATEWAY_URL = 'http://127.0.0.1:18789', OPENCLAW_GATEWAY_TOKEN } = process.env

const openaiClient = new OpenAI({
  baseURL: `${OPENCLAW_GATEWAY_URL}/v1`,
  apiKey: OPENCLAW_GATEWAY_TOKEN || 'dummy',
  maxRetries: 2,
})

export async function chatWithOpenClaw({ userId, message, systemPrompt }) {
  try {
    const messages = []

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    messages.push({ role: 'user', content: message })

    const response = await openaiClient.chat.completions.create({
      model: 'openclaw:main',
      messages,
      user: userId,
      max_tokens: 2048,
    })

    return response.choices[0]?.message?.content || 'No response from OpenClaw'
  } catch (error) {
    logger.error('OpenClaw chat error:', error)
    throw new Error(`Failed to get response from OpenClaw: ${error.message}`)
  }
}
