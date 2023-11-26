import React, { useState, useEffect } from 'react'
import { textToSpeech, TextToSpeechRequest } from '../../api/chatbot-api'
import { Button } from '../button/Button'
import PlayIcon from 'img/icons/play-icon.svg'
import PauseIcon from 'img/icons/pause-icon.svg'

interface Props {
  text: string
}

export const StreamingAudioPlayer = ({ text }: Props) => {
  const [audioContext, setAudioContext] = useState<AudioContext>(null!)
  const [isPlaying, setIsPlaying] = useState(false)
  const [nextStartTime, setNextStartTime] = useState(0)
  const [bufferQueue, setBufferQueue] = useState<AudioBuffer[]>([])
  // const bufferQueueRef = useRef<AudioBuffer[]>([])
  // const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())

  // Create audio context on mount
  useEffect(() => {
    // @ts-ignore
    const context = new (window.AudioContext || window.webkitAudioContext)()
    setAudioContext(context)
    setNextStartTime(context.currentTime)

    return () => {
      context.close()
    }
  }, [])

  // useEffect(() => {
  //   bufferQueueRef.current = bufferQueue
  // }, [bufferQueue])

  // Configure the playback loop
  useEffect(() => {
    // Do nothing if we don't have a buffer or are not playing
    if (!audioContext || bufferQueue.length === 0 || !isPlaying) {
      return
    }

    const schedulePlayback = () => {
      while (bufferQueue.length > 0 && nextStartTime <= audioContext.currentTime) {
        console.log('Playing audio')
        const buffer = bufferQueue.shift()
        setBufferQueue([...bufferQueue])

        const source = audioContext.createBufferSource()
        if (buffer) {
          source.buffer = buffer
          source.connect(audioContext.destination)
          // activeSourcesRef.current.add(source)
          source.onended = () => {
            // activeSourcesRef.current.delete(source)
            // if (activeSourcesRef.current.size === 0 && bufferQueueRef.current.length === 0) {
            if (bufferQueue.length === 0) {
              setIsPlaying(false)
            }
          }
          source.start(nextStartTime)
          setNextStartTime(nextStartTime + buffer.duration)
        }
      }
      requestAnimationFrame(schedulePlayback)
    }

    requestAnimationFrame(schedulePlayback)
  }, [audioContext, bufferQueue, isPlaying, nextStartTime])

  const playAudio = async () => {
    if (!isPlaying && bufferQueue.length > 0) {
      setIsPlaying(true)
      await audioContext.resume()
      return
    }

    const req: TextToSpeechRequest = {
      text: text,
      stream: true,
    }

    try {
      const response = await textToSpeech(req)
      setIsPlaying(true)

      if (req.stream) {
        const reader = response.body!.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          console.log('Received audio data')
          const decodedData = await audioContext.decodeAudioData(value.buffer)
          setBufferQueue([...bufferQueue, decodedData])
        }
      } else {
        // Non-streaming version
        const reader = response.body!.getReader()
        const { value } = await reader.read()
        if (value) {
          const decodedData = await audioContext.decodeAudioData(value.buffer)
          setBufferQueue([decodedData])
        }
      }
    } catch (error) {
      console.error('Error converting text to speech:', error)
      setIsPlaying(false)
    }
  }

  const pauseAudio = () => {
    setIsPlaying(false)
    setNextStartTime(audioContext.currentTime)
  }

  return (
    <div>
      <Button
        title={isPlaying ? 'Pause' : 'Play'}
        onClick={isPlaying ? pauseAudio : playAudio}
        displayTitle={false}
        frame={false}
        imageSource={isPlaying ? PauseIcon : PlayIcon}
      />
    </div>
  )
}
