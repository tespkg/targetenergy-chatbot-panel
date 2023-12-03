function subscribe(eventName: string, id: string, listener: any) {
  document.addEventListener(`${eventName}-${id}`, listener);
}

function unsubscribe(eventName: string, id: string, listener: any) {
  document.removeEventListener(`${eventName}-${id}`, listener);
}

function publish(eventName: string, id: string, data?: any) {
  const event = new CustomEvent(`${eventName}-${id}`, { detail: data });
  document.dispatchEvent(event);
}

export const StreamingAudioPlayerEvents = { publish, subscribe, unsubscribe };
