import React, { useMemo } from 'react'
import { Button } from '../button/Button'
import PlayIcon from 'img/icons/play-icon.svg'
import PauseIcon from 'img/icons/pause-icon.svg'
import TextTpSpeechIcon from 'img/icons/text-to-speech-icon.svg'
import TextTpSpeechConvertIcon from 'img/icons/text-to-speech-in-progress-icon.svg'
import { STREAMING_AUDIO_PLAYER_STATE } from './constants'
import { useStreamingAudioPlayer } from '../../hooks/use-voice-recorder/useStreamingAudioPlayer'
// import TextTpSpeechInProgressIcon from 'img/icons/text-to-speech-in-progress-icon.svg'

interface Props {
  text: string
  id: string
}

export const StreamingAudioPlayer = ({ text, id }: Props) => {
  /** Hooks */
  const { audioPlayerState, convertTextToSpeech, resume, pause, hasAudioBuffers } = useStreamingAudioPlayer({ id })

  /** Memos */
  const isConvertTextToSpeechButtonEnable = useMemo(() => {
    return audioPlayerState === STREAMING_AUDIO_PLAYER_STATE.IDLE && !hasAudioBuffers
  }, [audioPlayerState, hasAudioBuffers])
  //
  const isPauseButtonEnable = useMemo(() => {
    return audioPlayerState === STREAMING_AUDIO_PLAYER_STATE.PLAYING
  }, [audioPlayerState])
  //
  const isResumeButtonEnable = useMemo(() => {
    return (
      (audioPlayerState === STREAMING_AUDIO_PLAYER_STATE.PAUSED ||
        audioPlayerState === STREAMING_AUDIO_PLAYER_STATE.IDLE) &&
      hasAudioBuffers
    )
  }, [audioPlayerState, hasAudioBuffers])

  /** Renderer */
  return (
    <div>
      {isPauseButtonEnable && (
        <Button title={'Pause'} onClick={pause} displayTitle={false} frame={false} imageSource={PauseIcon} />
      )}
      {isResumeButtonEnable && (
        <Button title={'Resume'} onClick={resume} displayTitle={false} frame={false} imageSource={PlayIcon} />
      )}
      {isConvertTextToSpeechButtonEnable && (
        <Button
          title={'Text to Speech'}
          onClick={() => {
            convertTextToSpeech(text)
          }}
          displayTitle={false}
          frame={false}
          imageSource={TextTpSpeechIcon}
        />
      )}
      {audioPlayerState === STREAMING_AUDIO_PLAYER_STATE.PROCESSING && (
        <Button
          title={'Converting Text to Speech'}
          onClick={() => {}}
          displayTitle={false}
          frame={false}
          imageSource={TextTpSpeechConvertIcon}
        />
      )}
    </div>
  )
}
