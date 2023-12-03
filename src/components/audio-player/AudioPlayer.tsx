import React, { useEffect, useRef, useState } from "react";
import { textToSpeech } from "../../api/chatbot-api";
import PlayIcon from "img/icons/play-icon.svg";
import PauseIcon from "img/icons/pause-icon.svg";
import { Button } from "../button/Button";

interface Props {
  text: string;
}

export const AudioPlayer = ({ text }: Props) => {
  const [audioContext, setAudioContext] = useState<AudioContext>(null!);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const sourceRef = useRef<AudioBufferSourceNode>();
  const isPausedRef = useRef(false);

  useEffect(() => {
    // @ts-ignore
    const context = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(context);
    return () => {
      context.close();
    };
  }, []);

  const fetchAudioBuffer = async (text: string) => {
    const response = await textToSpeech({
      text,
      stream: false,
    });

    const reader = response.body!.getReader();
    const { value } = await reader.read();
    if (value) {
      const audioBuffer = await audioContext.decodeAudioData(value.buffer);
      return audioBuffer;
    }

    return undefined;
  };

  const playAudio = async () => {
    let buffer = audioBuffer;
    if (!buffer) {
      buffer = await fetchAudioBuffer(text);
      setAudioBuffer(buffer);
    } else {
    }
    if (!buffer) {
      console.log("No audio buffer");
      return;
    }

    setIsPlaying(true);
    const source = audioContext.createBufferSource();
    sourceRef.current = source;
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0, currentPlaybackTime);
    source.onended = () => {
      setIsPlaying(false);
      if (isPausedRef.current) {
        setCurrentPlaybackTime(audioContext.currentTime);
        isPausedRef.current = false;
      } else {
        setCurrentPlaybackTime(0);
        setAudioBuffer(undefined);
      }
    };
  };

  const pauseAudio = () => {
    if (sourceRef.current) {
      isPausedRef.current = true;
      setCurrentPlaybackTime(audioContext.currentTime);
      sourceRef.current.stop();
    }
  };

  return (
    <div>
      <Button
        title={isPlaying ? "Pause" : "Play"}
        onClick={isPlaying ? pauseAudio : playAudio}
        displayTitle={false}
        frame={false}
        imageSource={isPlaying ? PauseIcon : PlayIcon}
      />
    </div>
  );
};
