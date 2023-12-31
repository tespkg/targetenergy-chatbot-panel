import { RecorderStatus } from "commons/types/voice-recorder-types";
import { useCallback, useRef, useState } from "react";

const mimeType = "audio/webm";

export const useVoiceRecorder = () => {
  /** References */
  const mediaRecorder = useRef(null);

  /** States */
  const [isPermissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [recordingStatus, setRecordingStatus] = useState<RecorderStatus>("inactive");
  const [audioChunks, setAudioChunks] = useState<any[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  /** Callbacks */
  const onMediaStreamAvailable = useCallback((media: MediaRecorder) => {
    // Set the MediaRecorder instance to the mediaRecorder ref
    // @ts-ignore
    mediaRecorder.current = media;
    // Invokes the start method to start the recording process
    // @ts-ignore
    mediaRecorder.current.start();
    let localAudioChunks: any[] = [];
    // @ts-ignore
    mediaRecorder.current.ondataavailable = (event) => {
      if (typeof event.data === "undefined") {
        return;
      }
      if (event.data.size === 0) {
        return;
      }
      console.log("Audio available");

      localAudioChunks.push(event.data);
    };
    setAudioChunks(localAudioChunks);
  }, []);
  //
  const startRecording = useCallback(async () => {
    console.log("Starting recording.");

    try {
      // Check if navigator.mediaDevices.getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log("Media Devices API not supported.");
        return;
      }

      // Try to get user media
      const streamData = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Check for MediaRecorder support
      if (!window.MediaRecorder) {
        console.log("MediaRecorder API not supported.");
        return;
      }

      // Create new Media recorder instance using the stream
      const media = new MediaRecorder(streamData, { mimeType: mimeType });
      onMediaStreamAvailable(media);
      setRecordingStatus("recording");
    } catch (error) {
      // Handle errors (such as user denying permission)
      console.error("Error accessing media devices:", error);
      setPermissionDenied(true);
    }
  }, [onMediaStreamAvailable]);
  //
  const stopRecording = useCallback(() => {
    console.log("Stopping recording.");
    setRecordingStatus("inactive");
    setAudioChunks([]);
    // Stops the recording instance
    // @ts-ignore
    mediaRecorder.current.stop();
    // @ts-ignore
    mediaRecorder.current.onstop = () => {
      // Creates a blob file from the audio chunks data
      console.log("audioChunks: ", audioChunks);

      const _audioBlob = new Blob(audioChunks, { type: mimeType });
      // Creates a playable URL from the blob file.
      const _audioUrl = URL.createObjectURL(_audioBlob);
      setAudioUrl(_audioUrl);
      setAudioBlob(_audioBlob);
    };
  }, [audioChunks]);
  //
  const resetRecording = useCallback(() => {
    console.log("Resetting recording.");
    setRecordingStatus("inactive");
    setAudioChunks([]);
    setAudioUrl(null);
    setAudioBlob(null);
  }, []);

  /** Return */
  return {
    audioUrl,
    audioBlob,
    recordingStatus,
    isPermissionDenied,
    stopRecording,
    startRecording,
    resetRecording,
  };
};
