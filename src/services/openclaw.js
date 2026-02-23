import OpenAI from 'openai'
import logger from '../utilities/logger.js'

const { OPENCLAW_GATEWAY_URL = 'http://127.0.0.1:18789', OPENCLAW_GATEWAY_TOKEN, AUTHOR_ID } = process.env

const openaiClient = new OpenAI({
  baseURL: `${OPENCLAW_GATEWAY_URL}/v1`,
  apiKey: OPENCLAW_GATEWAY_TOKEN || 'dummy',
  maxRetries: 2,
  timeout: 30000,
})

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant. Respond in Traditional Chinese unless requested otherwise.`

export async function chatWithOpenClaw({ userId, message, systemPrompt = DEFAULT_SYSTEM_PROMPT, images = [] }) {
  const ROLE = AUTHOR_ID === userId ? 'MASTER' : 'GUEST'
  const messages = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  message = `${message} | 請稱我為 ${ROLE}`
  let userContent = message
  if (images.length > 0) {
    userContent = [{ type: 'text', text: message }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))]
  }

  messages.push({ role: 'user', content: userContent })
  const createRequest = async () =>
    openaiClient.chat.completions.create({
      model: images.length > 0 ? 'openclaw:vision' : 'openclaw:main',
      messages,
      user: userId,
      max_tokens: 2048,
    })

  try {
    const response = await createRequest()
    const content = response.choices[0]?.message?.content
    if (!content) {
      logger.warn({ response: JSON.stringify(response, null, 2) }, 'No content in OpenClaw response')
    }
    return content || 'No response from OpenClaw'
  } catch (error) {
    if (checkIsConnectionError(error)) {
      await tryReconnectOpenClaw(userId, createRequest)
    }

    logger.error({ error: error.message, stack: error.stack }, 'OpenClaw chat error')
    throw new Error(`Failed to get response from OpenClaw: ${error.message}`)
  }
}

function checkIsConnectionError(error) {
  return (
    error.code === 'ETIMEDOUT' ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ECONNRESET' ||
    error.message?.includes('timeout') ||
    error.message?.includes('connection')
  )
}

async function tryReconnectOpenClaw(userId, createRequest) {
  try {
    await openaiClient.chat.completions.create({
      model: 'openclaw:main',
      messages: [{ role: 'user', content: '/new' }],
      user: userId,
    })
    const response = await createRequest()

    const content = response.choices[0]?.message?.content
    if (!content) {
      logger.warn({ response: JSON.stringify(response, null, 2) }, 'No content in OpenClaw response after retry')
    }
    return content || 'No response from OpenClaw'
  } catch (retryError) {
    logger.error({ error: retryError.message, stack: retryError.stack }, 'OpenClaw chat error after retry')
    throw new Error(`Failed to get response from OpenClaw: ${retryError.message}`)
  }
}
