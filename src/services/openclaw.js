import logger from '../utilities/logger.js'

const { OPENCLAW_GATEWAY_URL = 'http://127.0.0.1:18789', OPENCLAW_GATEWAY_TOKEN, AUTHOR_ID, ZAI_API_KEY } = process.env

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant. Respond in Traditional Chinese unless requested otherwise.`
const MASTER_MODEL = 'zai/glm-4.7'
const GUEST_MODEL = 'glm-4.5-air'
const max_tokens = 4096

async function makeOpenClawRequest(requestBody) {
  const response = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENCLAW_GATEWAY_TOKEN || 'dummy'}`,
    },
    body: JSON.stringify(requestBody),
  })
  const data = await response.json()

  if (data.error) {
    logger.error({ error: data.error }, 'OpenClaw API returned error')
    throw new Error(data.error.message || 'OpenClaw API error')
  }
  return data
}

async function makeZaiDirectRequest(requestBody) {
  const response = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ZAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  })
  const data = await response.json()
  if (data.error) {
    logger.error({ error: data.error }, 'Z.ai API returned error')
    throw new Error(data.error.message || 'Z.ai API error')
  }

  return data
}

export async function chatWithAI({ userId, message, systemPrompt = DEFAULT_SYSTEM_PROMPT, images = [] }) {
  // TEST: role
  const ROLE = AUTHOR_ID === userId ? 'MASTER' : 'GUEST'
  // const ROLE = 'GUEST'
  const messages = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: `${systemPrompt} | 當前角色是: ${ROLE}` })
  }
  let userContent = message
  if (images.length > 0) {
    userContent = [{ type: 'text', text: message }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))]
  }

  messages.push({ role: 'user', content: userContent })
  let createRequest = null
  if (ROLE === 'MASTER') {
    createRequest = async () =>
      makeOpenClawRequest({
        model: MASTER_MODEL,
        messages,
        user: userId,
        max_tokens,
      })
  } else {
    createRequest = async () =>
      makeZaiDirectRequest({
        model: GUEST_MODEL,
        messages,
        user: userId,
        max_tokens,
      })
  }

  try {
    const response = await createRequest()
    const content = response.choices?.[0]?.message?.content
    if (!content) {
      logger.warn({ response: JSON.stringify(response, null, 2) }, 'No content in OpenClaw response')
    }
    return content || 'No response from OpenClaw'
  } catch (error) {
    if (ROLE === 'MASTER' && checkIsConnectionError(error)) {
      return await tryReconnectOpenClaw(userId, createRequest)
    }

    if (ROLE !== 'MASTER') {
      logger.error({ error: error.message, stack: error.stack }, 'Z.ai chat error')
      throw new Error(`Failed to get response from Z.ai: ${error.message}`)
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
    await makeOpenClawRequest({
      model: 'openclaw:main',
      messages: [{ role: 'user', content: '/new' }],
      user: userId,
    })
    const response = await createRequest()

    const content = response.choices?.[0]?.message?.content
    if (!content) {
      logger.warn({ response: JSON.stringify(response, null, 2) }, 'No content in OpenClaw response after retry')
    }
    return content || 'No response from OpenClaw'
  } catch (retryError) {
    logger.error({ error: retryError.message, stack: retryError.stack }, 'OpenClaw chat error after retry')
    throw new Error(`Failed to get response from OpenClaw: ${retryError.message}`)
  }
}
