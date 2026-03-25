const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const axios = require('axios')

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 4000)

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
}))

app.use(express.json())

const runSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    response: { type: String, required: true },
    model: { type: String, required: true },
  },
  { timestamps: true },
)

const Run = mongoose.models.Run || mongoose.model('Run', runSchema)

let connectionPromise

async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in the server environment.')
  }
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI)
  }
  return connectionPromise
}

app.get('/api/health', async (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1
  res.json({ ok: true, dbReady })
})

const FREE_MODELS = [
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-4b-it:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
]

app.post('/api/ask-ai', async (req, res) => {
  const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : ''

  if (!prompt) {
    return res.status(400).json({ error: 'A prompt is required.' })
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY in the server environment.' })
  }

  const configuredModel = process.env.OPENROUTER_MODEL
  const modelsToTry = configuredModel
    ? [configuredModel, ...FREE_MODELS.filter((m) => m !== configuredModel)]
    : FREE_MODELS

  let lastError = 'All models failed.'

  for (const model of modelsToTry) {
    try {
      const openRouterResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model, messages: [{ role: 'user', content: prompt }] },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://futureblink-y358.onrender.com',
            'X-Title': process.env.OPENROUTER_APP_NAME || 'AI Flow Runner',
          },
        },
      )

      const output = openRouterResponse.data?.choices?.[0]?.message?.content?.trim()
      if (!output) {
        lastError = 'OpenRouter returned an empty response.'
        continue
      }

      return res.json({ output, model })
    } catch (error) {
      const code = error.response?.data?.error?.code
      lastError = error.response?.data?.error?.message || error.message || 'Unknown error.'
      console.error(`Model ${model} failed (${code}): ${lastError}`)
      if (code !== 429) break
    }
  }

  return res.status(500).json({ error: lastError })
})

app.post('/api/save', async (req, res) => {
  const { prompt, response, model } = req.body

  if (!prompt || !response) {
    return res.status(400).json({ error: 'prompt and response are required.' })
  }

  try {
    await connectToDatabase()
    const saved = await Run.create({
      prompt,
      response,
      model: model || 'unknown',
    })
    return res.json({ savedRunId: saved._id.toString() })
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to save to database.' })
  }
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
