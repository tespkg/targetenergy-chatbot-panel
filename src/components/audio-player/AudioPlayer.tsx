import React, { useState, useEffect } from 'react'
import { textToSpeech, TextToSpeechRequest } from '../../api/chatbot-api'

interface Props {
  text: string
}

export const AudioPlayer = ({ text }: Props) => {
  const [audioContext, setAudioContext] = useState<AudioContext>(null!)
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode>()
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    // @ts-ignore
    const context = new (window.AudioContext || window.webkitAudioContext)()
    setAudioContext(context)
    return () => {
      context.close()
    }
  }, [])

  const playAudio = async () => {
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    try {
      const req: TextToSpeechRequest = {
        text: text,
        stream: true,
      }
      const response = await textToSpeech(req)
      setIsPlaying(true)

      if (req.stream) {
        // Process the stream
        while (true) {
          const reader = response.body!.getReader()
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          // Convert the chunk to an ArrayBuffer and decode it
          await audioContext.decodeAudioData(value.buffer, (decodedData) => {
            // Create a buffer source
            const source = audioContext.createBufferSource()
            source.buffer = decodedData
            source.connect(audioContext.destination)
            source.start()
            setSourceNode(source) // Save the source node to stop it later if needed
          })
        }
      }
    } catch (error) {
      console.error('Error playing streamed audio:', error)
    } finally {
      setIsPlaying(false)
      setSourceNode(undefined)
    }
  }

  const pauseAudio = () => {
    if (sourceNode) {
      sourceNode.stop()
      // setPlaybackTime(audioContext.currentTime)
    }
    setIsPlaying(false)
  }

  return (
    <div>
      <button onClick={isPlaying ? pauseAudio : playAudio}>Play Streamed Audio</button>
    </div>
  )
}
