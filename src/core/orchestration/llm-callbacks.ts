export const MAIN_AGENT_NAME = "main";

export enum EventType {
  Delta = "delta",
  Working = "working",
  Error = "error",
  Success = "success",
}

export interface CommonEventData {
  agent: string;
  type: EventType;
}

export interface DeltaEventData {
  message: string;
  turn?: number;
}

export type DeltaEvent = CommonEventData & DeltaEventData;

export interface WorkingEventData {
  message: string;
  isAgent: boolean;
  func?: string;
  params?: any;
  turn?: number;
  tool?: string;
}

export type WorkingEvent = CommonEventData & WorkingEventData;

export interface ErrorEventData {
  message: string;
  error: any;
  turn: number;
  func?: string;
  params?: any;
}

export type ErrorEvent = CommonEventData & ErrorEventData;

export interface SuccessEventData {
  message: string;
  turn?: number;
  params: any;
  result: any;
}

export type SuccessEvent = CommonEventData & SuccessEventData;

export interface LlmTrace {
  id: string;
  parentId?: string;
  name: string;
  type: "agent" | "tool";
  startTime: Date;
  endTime: Date;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalPrice: number;
  };
  aggregatedTokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalPrice: number;
  };
  inputs: any;
  outputs: any;
  meta: any;
  error?: any;
  subTraces: LlmTrace[];
}

export interface LlmCallbacks {
  onDelta?: (eventData: DeltaEvent) => Promise<void> | void;
  onWorking?: (eventData: WorkingEvent) => Promise<void> | void;
  onError?: (eventData: ErrorEvent) => Promise<void> | void;
  onSuccess?: (eventData: SuccessEvent) => Promise<void> | void;
  onTrace?: (trace: LlmTrace) => Promise<void> | void;
}

export class LlmCallbackManager {
  private readonly callbacks?: LlmCallbacks;
  private readonly agentName: string;
  private readonly traces: LlmTrace[];

  constructor(agentName: string, callbacks?: LlmCallbacks, traces: LlmTrace[] = []) {
    this.agentName = agentName;
    this.callbacks = callbacks;
    this.traces = traces;
  }

  forAgent(agentName: string): LlmCallbackManager {
    return new LlmCallbackManager(this.agentName + "." + agentName, this.callbacks, this.traces);
  }

  emitDelta = async (eventData: DeltaEventData) => {
    await this.callbacks?.onDelta?.({ ...eventData, ...this.commonEventData(EventType.Delta) });
  };

  emitWorking = async (eventData: WorkingEventData) => {
    await this.callbacks?.onWorking?.({ ...eventData, ...this.commonEventData(EventType.Working) });
  };

  emitError = async (eventData: ErrorEventData) => {
    await this.callbacks?.onError?.({ ...eventData, ...this.commonEventData(EventType.Error) });
  };

  emitSuccess = async (eventData: SuccessEventData) => {
    await this.callbacks?.onSuccess?.({ ...eventData, ...this.commonEventData(EventType.Success) });
  };

  emitTrace = async (trace: LlmTrace) => {
    trace = this.traces.find((t) => t.id === trace.id) ?? trace;

    // A quick and dirty way of only emitting the top-level traces for now
    if (trace.parentId) {
      return;
    }

    this.calculateAggregateTokenUsage(trace);
    await this.callbacks?.onTrace?.(trace);
  };

  addTrace = (trace: LlmTrace) => {
    this.traces.push(trace);
    this.updateTrace(trace, true);
  };

  updateTrace = (trace: LlmTrace, addToParent = false) => {
    while (trace.parentId) {
      const parent = this.traces.find((t) => t.id === trace.parentId);
      if (!parent) {
        break;
      }

      // Update the parent end time
      parent.endTime = trace.endTime;

      // Add the trace to the parent (should only happen once)
      if (addToParent) {
        parent.subTraces.push(trace);
        addToParent = false;
      }

      trace = parent;
    }
  };

  private calculateAggregateTokenUsage = (trace: LlmTrace) => {
    trace.aggregatedTokenUsage.promptTokens = trace.tokenUsage.promptTokens;
    trace.aggregatedTokenUsage.completionTokens = trace.tokenUsage.completionTokens;
    trace.aggregatedTokenUsage.totalTokens = trace.tokenUsage.totalTokens;
    trace.aggregatedTokenUsage.totalPrice = trace.tokenUsage.totalPrice;

    for (let subTrace of trace.subTraces) {
      this.calculateAggregateTokenUsage(subTrace);
      trace.aggregatedTokenUsage.promptTokens += subTrace.aggregatedTokenUsage.promptTokens;
      trace.aggregatedTokenUsage.completionTokens += subTrace.aggregatedTokenUsage.completionTokens;
      trace.aggregatedTokenUsage.totalTokens += subTrace.aggregatedTokenUsage.totalTokens;
      trace.aggregatedTokenUsage.totalPrice += subTrace.aggregatedTokenUsage.totalPrice;
    }
  };

  commonEventData = (type: EventType): CommonEventData => {
    return { type, agent: this.agentName };
  };
}
