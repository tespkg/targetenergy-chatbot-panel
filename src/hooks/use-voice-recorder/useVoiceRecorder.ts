import { RecorderStatus } from 'commons/types/VoiceRecorderTypes'
import { useCallback, useRef, useState } from 'react'

const mimeType = 'audio/webm'

export const useVoiceRecorder = () => {
  /** References */
  const mediaRecorder = useRef(null)

  /** States */
  const [isPermissionDenied, setPermissionDenied] = useState<boolean>(false)
  const [recordingStatus, setRecordingStatus] = useState<RecorderStatus>('inactive')
  const [audioChunks, setAudioChunks] = useState<any[]>([])
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  /** Callbacks */
  const onMediaStreamAvailable = useCallback((media: MediaRecorder) => {
    // Set the MediaRecorder instance to the mediaRecorder ref
    // @ts-ignore
    mediaRecorder.current = media
    // Invokes the start method to start the recording process
    // @ts-ignore
    mediaRecorder.current.start()
    let localAudioChunks: any[] = []
    // @ts-ignore
    mediaRecorder.current.ondataavailable = (event) => {
      if (typeof event.data === 'undefined') {
        return
      }
      if (event.data.size === 0) {
        return
      }
      console.log('Audio available')

      localAudioChunks.push(event.data)
    }
    setAudioChunks(localAudioChunks)
  }, [])
  //
  const startRecording = useCallback(async () => {
    console.log('Starting recording.')
    navigator.permissions
      // @ts-ignore
      .query({ name: 'microphone' })
      .then(async (permission) => {
        if (permission.state !== 'denied') {
          await navigator.mediaDevices
            .getUserMedia({
              audio: true,
              video: false,
            })
            .then((streamData) => {
              // Create new Media recorder instance using the stream
              const media = new MediaRecorder(streamData, { mimeType: mimeType })
              onMediaStreamAvailable(media)
            })
          setRecordingStatus('recording')
        } else {
          setPermissionDenied(true)
          console.log('Voice record permission denied. ')
        }
      })
  }, [onMediaStreamAvailable])
  //
  const stopRecording = useCallback(() => {
    console.log('Stopping recording.')
    setRecordingStatus('inactive')
    setAudioChunks([])
    // Stops the recording instance
    // @ts-ignore
    mediaRecorder.current.stop()
    // @ts-ignore
    mediaRecorder.current.onstop = () => {
      // Creates a blob file from the audio chunks data
      console.log('audioChunks: ', audioChunks)

      const audioBlob = new Blob(audioChunks, { type: mimeType })
      // Creates a playable URL from the blob file.
      const audioUrl = URL.createObjectURL(audioBlob)
      console.log('audioUrl: ', audioUrl)
      setAudioUrl(audioUrl)
    }
  }, [audioChunks])
  //
  const resetRecording = useCallback(() => {
    console.log('Resetting recording.')
    setRecordingStatus('inactive')
    setAudioChunks([])
    setAudioUrl(null)
  }, [])

  /** Return */
  return {
    audioUrl,
    recordingStatus,
    isPermissionDenied,
    stopRecording,
    startRecording,
    resetRecording,
  }
}
