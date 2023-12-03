import { BotGenerateRequest, TextToSpeechRequest } from "./chatbot-types";

// const BASE_URL = `https://dso.dev.meeraspace.com/chatbot-api/v1`
const BASE_URL = "http://localhost:8000/api/v1";
const AUTOMATIC_TIMEOUT = 15 * 1000; // 15 seconds

export async function transcribe(voice: Blob) {
  const formData = new FormData();
  formData.append("audio", voice, "voice_recording.webm");
  let options: RequestInit = {
    method: "POST",
    body: formData,
  };
  const url = `${BASE_URL}/transcribe`;
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const { text } = await response.json();
  return text;
}

export async function generate(request: BotGenerateRequest, abortSignal?: AbortSignal) {
  // Sometimes the backend just won't respond. Haven't figured out why yet.
  // So for now, we'll abort the request after a timeout to prevent user from waiting too much.
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), AUTOMATIC_TIMEOUT);

  // If the user manually aborts the request, we will abort our internal abort controller
  let manuallyAborted = false;
  const manuallyAbort = () => {
    manuallyAborted = true;
    abortController.abort();
  };
  if (abortSignal) {
    abortSignal.addEventListener("abort", manuallyAbort);
  }

  const url = `${BASE_URL}/generate`;
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json",
      },
      signal: abortController.signal,
    });
    if (!response.ok) {
      throw new Error("request to the generate endpoint failed");
    }
    return response;
  } catch (error) {
    if (abortController.signal.aborted && !manuallyAborted) {
      throw new Error("the request was aborted due to a timeout or manual abort");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (abortSignal) {
      abortSignal.removeEventListener("abort", manuallyAbort);
    }
  }
}

export async function textToSpeech(req: TextToSpeechRequest, abortSignal?: AbortSignal) {
  const url = `${BASE_URL}/text-to-speech`;
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(req),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("request to the text-to-speech endpoint failed");
  }
  if (abortSignal?.aborted) {
    throw new Error("the agent was aborted");
  }
  return response;
}
