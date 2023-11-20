export const DEFAULT_AGENT_NAME = 'root'

export type EventType = 'delta' | 'working' | 'error' | 'success'

interface BaseEventData {
  message: string
  agent?: string
  type: EventType
}

export interface DeltaEventData extends BaseEventData {
  turn?: number
  type: 'delta'
}

export interface WorkingEventData extends BaseEventData {
  type: 'working'
  func?: string
  params?: any
  turn?: number
}

export interface ErrorEventData extends BaseEventData {
  type: 'error'
  error: any
  turn: number
  func?: string
  params?: any
}

export interface SuccessEventData extends BaseEventData {
  type: 'success'
  turn: number
  params: any
  result: any
}

export interface Callbacks {
  onDelta?: (eventData: DeltaEventData) => Promise<void> | void
  onWorking?: (eventData: WorkingEventData) => Promise<void> | void
  onError?: (eventData: ErrorEventData) => Promise<void> | void
  onSuccess?: (eventData: SuccessEventData) => Promise<void> | void
}

export const NullCallbacks: Callbacks = {
  onDelta: undefined,
  onWorking: undefined,
  onError: undefined,
  onSuccess: undefined,
}

export function agentCallbacks(agent: string, callbacks?: Callbacks): Callbacks | undefined {
  if (!callbacks) {
    return callbacks
  }

  const updateAgentName = (eventData: any) => {
    return { ...eventData, agent: agent + (eventData.agent ? '.' + eventData.agent : '') }
  }

  return {
    onDelta: callbacks.onDelta
      ? async (eventData: DeltaEventData) => await callbacks.onDelta!(updateAgentName(eventData))
      : undefined,
    onWorking: callbacks.onWorking
      ? async (eventData: WorkingEventData) => await callbacks.onWorking!(updateAgentName(eventData))
      : undefined,
    onError: callbacks.onError
      ? async (eventData: ErrorEventData) => await callbacks.onError!(updateAgentName(eventData))
      : undefined,
    onSuccess: callbacks.onSuccess
      ? async (eventData: SuccessEventData) => await callbacks.onSuccess!(updateAgentName(eventData))
      : undefined,
  }
}
