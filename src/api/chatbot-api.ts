import { BotGenerateRequest, TextToSpeechRequest } from './chatbot-types'

const BASE_URL = `https://dso.dev.meeraspace.com/chatbot-api/v1`
// const BASE_URL = 'http://localhost:8000/api/v1'

export async function transcribe(voice: Blob) {
  const formData = new FormData()
  formData.append('audio', voice, 'voice_recording.webm')
  let options: RequestInit = {
    method: 'POST',
    body: formData,
  }
  const url = `${BASE_URL}/transcribe`
  const response = await fetch(url, options)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText)
  }

  const { text } = await response.json()
  return text
}

export async function generate(request: BotGenerateRequest, abortSignal?: AbortSignal) {
  const url = `${BASE_URL}/generate`
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortSignal,
  })
  if (!response.ok) {
    throw new Error('request to the generate endpoint failed')
  }
  if (abortSignal?.aborted) {
    throw new Error('the agent was aborted')
  }

  return response
}

export async function textToSpeech(req: TextToSpeechRequest, abortSignal?: AbortSignal) {
  const url = `${BASE_URL}/text-to-speech`
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(req),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    throw new Error('request to the text-to-speech endpoint failed')
  }
  if (abortSignal?.aborted) {
    throw new Error('the agent was aborted')
  }
  return response
}
