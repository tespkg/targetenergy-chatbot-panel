import { LlmTrace } from "../../core/orchestration/llm-callbacks";

export type StoreType = { traces: LlmTrace[]; infoPanelMessageId?: string };
