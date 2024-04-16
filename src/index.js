import 'dotenv/config'
import express from 'express'
import { initDiscordBot } from './discord-bot.js'

const { PORT } = process.env

const port = PORT || 3000
const app = express()

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello world')
})

app.listen(port, async () => {
  initDiscordBot()
  console.log(`server is listening on port: ${port}`)
})
