import { LlmTrace } from "../../core/orchestration/llm-callbacks";
import { ChatBotMessage } from "../../commons/types/ChatMessagePanelTypes";

export type StoreType = { traces: LlmTrace[]; infoPanelMessageId?: string; chatContent?: ChatBotMessage[] };
