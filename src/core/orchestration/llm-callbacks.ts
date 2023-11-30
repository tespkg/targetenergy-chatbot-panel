export const MAIN_AGENT_NAME = 'main'

export enum EventType {
  Delta = 'delta',
  Working = 'working',
  Error = 'error',
  Success = 'success',
}

export interface CommonEventData {
  agent: string
  type: EventType
}

export interface DeltaEventData {
  message: string
  turn?: number
}

export type DeltaEvent = CommonEventData & DeltaEventData

export interface WorkingEventData {
  message: string
  func?: string
  params?: any
  turn?: number
}

export type WorkingEvent = CommonEventData & WorkingEventData

export interface ErrorEventData {
  message: string
  error: any
  turn: number
  func?: string
  params?: any
}

export type ErrorEvent = CommonEventData & ErrorEventData

export interface SuccessEventData {
  message: string
  turn: number
  params: any
  result: any
}

export type SuccessEvent = CommonEventData & SuccessEventData

export interface LlmCallbacks {
  onDelta?: (eventData: DeltaEvent) => Promise<void> | void
  onWorking?: (eventData: WorkingEvent) => Promise<void> | void
  onError?: (eventData: ErrorEvent) => Promise<void> | void
  onSuccess?: (eventData: SuccessEvent) => Promise<void> | void
}

export class LlmCallbackManager {
  private readonly callbacks?: LlmCallbacks
  private readonly agentName: string

  constructor(agentName: string, callbacks?: LlmCallbacks) {
    this.agentName = agentName
    this.callbacks = callbacks
  }

  forAgent(agentName: string): LlmCallbackManager {
    return new LlmCallbackManager(this.agentName + '.' + agentName, this.callbacks)
  }

  onDelta = async (eventData: DeltaEventData) => {
    await this.callbacks?.onDelta?.({ ...eventData, ...this.commonEventData(EventType.Delta) })
  }

  onWorking = async (eventData: WorkingEventData) => {
    await this.callbacks?.onWorking?.({ ...eventData, ...this.commonEventData(EventType.Working) })
  }

  onError = async (eventData: ErrorEventData) => {
    await this.callbacks?.onError?.({ ...eventData, ...this.commonEventData(EventType.Error) })
  }

  onSuccess = async (eventData: SuccessEventData) => {
    await this.callbacks?.onSuccess?.({ ...eventData, ...this.commonEventData(EventType.Success) })
  }

  commonEventData = (type: EventType): CommonEventData => {
    return { type, agent: this.agentName }
  }
}
