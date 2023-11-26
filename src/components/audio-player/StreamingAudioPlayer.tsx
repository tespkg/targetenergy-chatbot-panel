import React, { useState, useEffect, useRef, useCallback } from 'react'
import { textToSpeech } from '../../api/chatbot-api'
import { Button } from '../button/Button'
import PlayIcon from 'img/icons/play-icon.svg'
import PauseIcon from 'img/icons/pause-icon.svg'
import TextTpSpeechIcon from 'img/icons/text-to-speech-icon.svg'
import TextTpSpeechInProgressIcon from 'img/icons/text-to-speech-in-progress-icon.svg'

const AUDIO_BUFFER_SIZE = 512 * 1024

interface Props {
  text: string
}

export const StreamingAudioPlayer = ({ text }: Props) => {
  /** States */
  const [audioContext, setAudioContext] = useState<AudioContext>(null!)
  const [isPlaying, setIsPlaying] = useState(false)
  const bufferQueueRef = useRef<AudioBuffer[]>([])
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())
  const [isTextToSpeechInProgress, setTextToSpeechInProgress] = useState(false)

  // Create audio context on mount
  useEffect(() => {
    // @ts-ignore
    const context = new (window.AudioContext || window.webkitAudioContext)()
    setAudioContext(context)
    return () => {
      context.close()
    }
  }, [])

  // Play a single buffer
  const playBuffer = useCallback(
    (buffer: AudioBuffer) => {
      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(audioContext.destination)
      source.start()
      activeSourcesRef.current.add(source)
      source.onended = () => {
        activeSourcesRef.current.delete(source)
        bufferQueueRef.current.shift()
        if (bufferQueueRef.current.length > 0 && isPlaying) {
          playBuffer(bufferQueueRef.current[0])
        } else {
          setIsPlaying(false)
        }
      }
    },
    [audioContext, isPlaying]
  )

  // Configure the playback loop
  useEffect(() => {
    if (!audioContext || bufferQueueRef.current.length === 0 || !isPlaying) {
      return
    }

    if (activeSourcesRef.current.size === 0) {
      playBuffer(bufferQueueRef.current[0])
    }
  }, [audioContext, isPlaying, playBuffer])

  const playAudio = useCallback(async () => {
    if (!audioContext) {
      return
    }

    await audioContext.resume()

    try {
      setTextToSpeechInProgress(true)
      const response = await textToSpeech({
        text: text,
        stream: true,
      })

      const reader = response.body!.getReader()

      let firstBuffer = true
      let audioBuffer = new Uint8Array()

      const handleNewBuffer = async (audioBuffer: Uint8Array) => {
        const decodedData = await audioContext.decodeAudioData(audioBuffer.buffer)
        bufferQueueRef.current.push(decodedData)

        if (firstBuffer) {
          firstBuffer = false
          setIsPlaying(true)
          playBuffer(bufferQueueRef.current[0])
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          setTextToSpeechInProgress(false)

          if (audioBuffer.length > 0) {
            await handleNewBuffer(audioBuffer)
          }
          break
        }

        // Buffer the received data into a single buffer before decoding
        let newBuffer = new Uint8Array(audioBuffer.length + value.length)
        newBuffer.set(audioBuffer)
        newBuffer.set(value, audioBuffer.length)
        audioBuffer = newBuffer

        if (audioBuffer.length < AUDIO_BUFFER_SIZE) {
          continue
        }

        await handleNewBuffer(audioBuffer)
        audioBuffer = new Uint8Array()
      }
    } catch (error) {
      console.error('Error converting text to speech:', error)
      setIsPlaying(false)
    }
  }, [audioContext, playBuffer, text])

  const pauseAudio = async () => {
    await audioContext.suspend()
    setIsPlaying(false)
    activeSourcesRef.current.forEach((source) => source.stop())
    activeSourcesRef.current.clear()
  }

  return (
    <div>
      <Button
        title={isPlaying ? 'Pause' : 'Play'}
        onClick={isPlaying ? pauseAudio : playAudio}
        displayTitle={false}
        frame={false}
        imageSource={
          isPlaying
            ? PauseIcon
            : isTextToSpeechInProgress
            ? TextTpSpeechInProgressIcon
            : bufferQueueRef.current.length === 0
            ? TextTpSpeechIcon
            : PlayIcon
        }
      />
    </div>
  )
}
