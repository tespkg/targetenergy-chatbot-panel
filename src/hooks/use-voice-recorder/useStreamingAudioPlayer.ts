import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { StreamingAudioPlayerEvents } from '../../components/audio-player/events'
import { STREAMING_AUDIO_PLAYER_EVENT, STREAMING_AUDIO_PLAYER_STATE } from '../../components/audio-player/constants'
import { get } from 'lodash'
import { textToSpeech } from '../../api/chatbot-api'
import { AudioUtils } from '../../components/audio-player/utils'

const AUDIO_BUFFER_SIZE_THRESHOLD = 128 * 1024

interface props {
  id: string
}
export const useStreamingAudioPlayer = ({ id }: props) => {
  /** States */
  const [audioPlayerState, setAudioAudioPlayerState] = useState<STREAMING_AUDIO_PLAYER_STATE>(
    STREAMING_AUDIO_PLAYER_STATE.IDLE
  )
  const playingState = useRef<boolean>(false)

  /** References */
  const audioContextRef = useRef<AudioContext>(null!)
  const queuedAudioBuffers = useRef<AudioBuffer[]>([])
  const currentPlayingBufferIndex = useRef<number>(0)
  const currentPlayingAudioSource = useRef<AudioBufferSourceNode | null>(null)
  const startedAt = useRef<number>(0)
  const pausedAt = useRef<number>(0)

  /** Functions and Callbacks*/
  const createAudioBufferSourceNodeFromAudioBuffer = (audioBuffer: AudioBuffer) => {
    const source = audioContextRef.current!.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContextRef.current!.destination)
    source.onended = () => {
      if (currentPlayingBufferIndex.current + 1 < queuedAudioBuffers.current.length && playingState.current) {
        // it is time to play next source
        console.log('There are more queued audio buffers, lets play next')
        currentPlayingBufferIndex.current = currentPlayingBufferIndex.current + 1
        StreamingAudioPlayerEvents.publish(STREAMING_AUDIO_PLAYER_EVENT.PLAY, id)
      } else {
        console.log('All Played. Lets stop source.')
        playingState.current = false
        setAudioAudioPlayerState(STREAMING_AUDIO_PLAYER_STATE.IDLE)
        currentPlayingBufferIndex.current = 0
        audioContextRef.current.suspend().then(() => {
          audioContextRef.current.close().then(() => {
            if (currentPlayingAudioSource && currentPlayingAudioSource.current) {
              currentPlayingAudioSource.current.stop(0)
            }
          })
        })
      }
    }
    return source
  }
  //
  const playBuffer = (audioBuffer: AudioBuffer) => {
    const source = createAudioBufferSourceNodeFromAudioBuffer(audioBuffer)
    source.start(0, 0)
    return { source }
  }
  //
  const onAudioBufferReceived = () => {
    // Let's play the audio on first audio buffer
    if (queuedAudioBuffers.current.length === 1) {
      startedAt.current = audioContextRef.current.currentTime
      StreamingAudioPlayerEvents.publish(STREAMING_AUDIO_PLAYER_EVENT.PLAY, id)
    }
  }
  //
  const convertTextToSpeechApi = (text: string, stream: boolean) => {
    setAudioAudioPlayerState(STREAMING_AUDIO_PLAYER_STATE.PROCESSING)
    textToSpeech({
      text: text,
      stream: stream,
    })
      .then((response) => {
        console.log('Response of text-to-speech API: ', response)
        let receivedValuesSize = 0
        let allReceivedValues: Uint8Array[] = []
        const reader = response.body!.getReader()
        const read = async () => {
          const { value, done } = await reader.read()
          if (done) {
            if (allReceivedValues.length > 0) {
              const mergedChunks = AudioUtils.mergeArrayOfUint8Array(allReceivedValues, receivedValuesSize)
              audioContextRef.current!.decodeAudioData(mergedChunks.buffer).then((decodedAudioBuffer) => {
                queuedAudioBuffers.current.push(decodedAudioBuffer)
                onAudioBufferReceived()
              })
            }
            reader.releaseLock()
            return
          }
          // decode chunk to audio stream
          receivedValuesSize += value.length
          allReceivedValues.push(value)
          if (receivedValuesSize > AUDIO_BUFFER_SIZE_THRESHOLD) {
            // We have enough values to play

            const mergedChunks = AudioUtils.mergeArrayOfUint8Array(allReceivedValues, receivedValuesSize)
            audioContextRef.current!.decodeAudioData(mergedChunks.buffer).then((decodedAudioBuffer) => {
              queuedAudioBuffers.current.push(decodedAudioBuffer)
              onAudioBufferReceived()
            })
            allReceivedValues = []
            receivedValuesSize = 0
          }
          await read()
        }
        read().then(() => {
          // Maybe we can delete all previous buffers and creating a completed buffer
          setAudioAudioPlayerState(STREAMING_AUDIO_PLAYER_STATE.IDLE)
        })
      })
      .catch(() => {
        setAudioAudioPlayerState(STREAMING_AUDIO_PLAYER_STATE.IDLE)
      })
  }

  /** Event listeners */
  const resumeEventListener = () => {
    console.log('Resume Event Listener.')
    if (audioContextRef.current.state === 'closed') {
      // @ts-ignore
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    playingState.current = true
    setAudioAudioPlayerState(STREAMING_AUDIO_PLAYER_STATE.PLAYING)
    const audioBuffer = get(queuedAudioBuffers.current, currentPlayingBufferIndex.current)
    const source = createAudioBufferSourceNodeFromAudioBuffer(audioBuffer)
    currentPlayingAudioSource.current = source
    source.start(0, pausedAt.current ? Math.floor(pausedAt.current - startedAt.current) : 0)
    startedAt.current = audioContextRef.current.currentTime
  }
  //
  const pauseEventListener = () => {
    console.log('Pause Event Listener.')
    playingState.current = false
    setAudioAudioPlayerState(STREAMING_AUDIO_PLAYER_STATE.PAUSED)
    pausedAt.current = audioContextRef.current.currentTime
    audioContextRef.current.suspend().then(() => {
      audioContextRef.current.close().then(() => {
        if (currentPlayingAudioSource && currentPlayingAudioSource.current) {
          currentPlayingAudioSource.current.stop(0)
        }
      })
    })
  }
  //
  const playEventListener = () => {
    console.log('Plat Event Listener.')
    playingState.current = true
    setAudioAudioPlayerState(STREAMING_AUDIO_PLAYER_STATE.PLAYING)
    const audioBuffer = get(queuedAudioBuffers.current, currentPlayingBufferIndex.current)
    const { source } = playBuffer(audioBuffer)
    if (source) {
      currentPlayingAudioSource.current = source
    }
  }

  /** Effects */
  useLayoutEffect(() => {
    // @ts-ignore
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()

    return () => {
      audioContextRef.current.suspend().then(() => {
        audioContextRef.current.close().then()
      })
    }
  }, [])
  //
  useEffect(() => {
    console.log('Subscribing to Streaming Audio Player Events.')
    StreamingAudioPlayerEvents.subscribe(STREAMING_AUDIO_PLAYER_EVENT.PLAY, id, playEventListener)
    StreamingAudioPlayerEvents.subscribe(STREAMING_AUDIO_PLAYER_EVENT.RESUME, id, resumeEventListener)
    StreamingAudioPlayerEvents.subscribe(STREAMING_AUDIO_PLAYER_EVENT.PAUSE, id, pauseEventListener)
    return () => {
      StreamingAudioPlayerEvents.unsubscribe(STREAMING_AUDIO_PLAYER_EVENT.PLAY, id, () => {})
      StreamingAudioPlayerEvents.unsubscribe(STREAMING_AUDIO_PLAYER_EVENT.RESUME, id, () => {})
      StreamingAudioPlayerEvents.unsubscribe(STREAMING_AUDIO_PLAYER_EVENT.PAUSE, id, () => {})
    }
  }, [id])

  /** Return */
  const resume = () => {
    StreamingAudioPlayerEvents.publish(STREAMING_AUDIO_PLAYER_EVENT.RESUME, id)
  }
  const pause = () => {
    StreamingAudioPlayerEvents.publish(STREAMING_AUDIO_PLAYER_EVENT.PAUSE, id)
  }
  const convertTextToSpeech = (text: string) => {
    convertTextToSpeechApi(text, true)
  }
  return {
    audioPlayerState,
    convertTextToSpeech,
    resume,
    pause,
    hasAudioBuffers: Boolean(queuedAudioBuffers.current.length),
  }
}
