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
  const [audioContext, setAudioContext] = useState<AudioContext>()
  const [isPlaying, setIsPlaying] = useState(false)
  const bufferQueueRef = useRef<AudioBuffer[]>([])
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())
  const [isTextToSpeechInProgress, setTextToSpeechInProgress] = useState(false)
  const playbackTimeRef = useRef(0)
  const lastBufferStartTimeRef = useRef(0)

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
    (buffer: AudioBuffer, startOffset = 0) => {
      if (!audioContext) {
        return
      }

      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(audioContext.destination)
      source.start(0, startOffset)
      lastBufferStartTimeRef.current = audioContext.currentTime - startOffset
      activeSourcesRef.current.add(source)
      source.onended = () => {
        activeSourcesRef.current.delete(source)
        playbackTimeRef.current = 0 // Reset playback time when a buffer finishes
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

  const resumeAudio = useCallback(async () => {
    if (!audioContext) {
      return
    }

    console.log('resumeAudio', audioContext.state, bufferQueueRef.current.length)
    if (audioContext.state === 'suspended' && bufferQueueRef.current.length > 0) {
      await audioContext.resume()
      setIsPlaying(true)

      if (bufferQueueRef.current.length > 0) {
        // Start playing from the next buffer in the queue
        playBuffer(bufferQueueRef.current[0], playbackTimeRef.current)
      }
    } else {
      await playAudio()
    }
  }, [audioContext, playAudio, playBuffer])

  // Function to pause audio
  const pauseAudio = async () => {
    if (!audioContext) {
      return
    }

    await audioContext.suspend()
    setIsPlaying(false)
    // Calculate how much of the current buffer has been played
    playbackTimeRef.current += audioContext.currentTime - lastBufferStartTimeRef.current

    // Stopping all active sources
    activeSourcesRef.current.forEach((source) => source.stop())
    activeSourcesRef.current.clear()
  }

  const getButtonImage = () => {
    if (isPlaying) {
      return PauseIcon
    } else if (isTextToSpeechInProgress) {
      return TextTpSpeechInProgressIcon
    } else if (bufferQueueRef.current.length === 0) {
      return TextTpSpeechIcon
    } else {
      return PlayIcon
    }
  }

  return (
    <div>
      <Button
        title={isPlaying ? 'Pause' : 'Play'}
        onClick={isPlaying ? pauseAudio : resumeAudio}
        displayTitle={false}
        frame={false}
        imageSource={getButtonImage()}
      />
    </div>
  )
}
