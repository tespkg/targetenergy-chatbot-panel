import { BotMessage } from "../../api/chatbot-types";
import { assetTreeManagerAgent } from "./asset-tree-manager-agent";
import { MAIN_AGENT_NAME } from "../orchestration/llm-callbacks";
import { panelManagerAgent } from "./panel-manager-agent";
import { FunctionContext, LlmAgent } from "../orchestration/llm-function";
import { LlmAgentExecutor } from "../orchestration/llm-agent-executor";
import { prettifyPlugin } from "../orchestration/llm-utils";

const pluging = [assetTreeManagerAgent, panelManagerAgent];

const DEFAULT_SYSTEM_MESSAGE = `You are helpful chatbot designed to help users interact with the Portfolio Management application.

## APPLICATION INTRODUCTION

The Portfolio Management is an advanced analytical platform designed to provide comprehensive insights into a 
company's asset performance. It allows users to interactively compare and assess the production metrics of wells, 
fields, or reservoirs through a dynamic interface. The application's core functionality enables the slicing and dicing 
of data based on user-defined criteria, facilitating a granular analysis of the production evolution, net production, 
financials, activities, investment ranking, and reserves & resources of assets.

Users can modify the hierarchical data structure to tailor the information to their specific needs, ensuring a highly 
customizable experience. The dashboard's info panels can be configured to display a range of aggregated data, 
including historical and predictive production profiles, financial comparisons, and drilling operation metrics. 
With the ability to track and compare predicted and actual production profiles, the Portfolio Management Dashboard 
empowers decision-makers to optimize their asset management strategy effectively.

## INSTRUCTIONS

You have access to a set of functions and agents that can be used to interact with the application.

## GUIDELINES

* If the value for a required function parameter is missing ask the user to provide the value.
* When user asks for an analysis, present the user with the steps that the analysis should follow and after user confirms the steps, generate the function calls to achieve the analysis.

## AGENTS OVERVIEW
Here are the list of agents that you can use to interact with the application:

${pluging.map((p) => prettifyPlugin(p).trim()).join("\n")}
`;

export const mainAgent: LlmAgent = {
  type: "agent",
  name: MAIN_AGENT_NAME,
  title: "Main",
  description: (_) => "Main agent that orchestrates other agents",
  systemMessage: DEFAULT_SYSTEM_MESSAGE,
  plugins: pluging,
};

export async function runMainAgent(messages: BotMessage[], context: FunctionContext) {
  const result = await LlmAgentExecutor.execute(messages, mainAgent, context);
  return result.content;
}
