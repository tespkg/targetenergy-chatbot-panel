export const subAgentParameters = {
  type: 'object',
  properties: {
    question: {
      type: 'string',
      description: `The question to ask, including any context that's important to the question from the conversation`,
    },
  },
  required: ['question'],
}
