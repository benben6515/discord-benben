import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import logger from '../utilities/logger.js'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export function getCache(key = 'chat') {
  const _path = path.join(__dirname, `../../data/${key}.json`)
  try {
    const data = fs.readFileSync(_path)
    return JSON.parse(data)
  } catch (error) {
    logger.error(error)
    return null
  }
}

export function setCache(key = 'chat', data = {}) {
  const _path = path.join(__dirname, `../../data/${key}.json`)
  try {
    fs.writeFileSync(_path, JSON.stringify(data))
  } catch (error) {
    logger.error(error)
    return null
  }
}
