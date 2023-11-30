import { Dashboard } from '../commons/types/dashboard-manager'
import { useCallback } from 'react'
import { debugCommands } from './find-panel'

interface Props {
  dashboard: Dashboard
}

function parseCommand(input: string): { commandName: string; commandArgs: Record<string, string | number> } {
  // Splitting the command and the rest of the arguments
  const [commandName, ...rest] = input.split(' ')
  const argsString = rest.join(' ')

  // Regular expression to match key=value pairs
  const argRegex = /(\w+)=(".*?"|\d+|\w+)/g
  let match: RegExpExecArray | null
  const commandArgs: Record<string, string | number> = {}

  // Iterating over each match and adding to the args object
  while ((match = argRegex.exec(argsString)) !== null) {
    const key = match[1]
    let value: string | number = match[2]

    // Remove quotes from string values and convert numerical values to numbers
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    } else if (!isNaN(Number(value))) {
      value = Number(value)
    }

    commandArgs[key] = value
  }

  return { commandName, commandArgs }
}

export function useDebugCommand() {
  const isCommand = useCallback((text: string) => {
    return text.startsWith('/')
  }, [])

  const processCommand = useCallback(async (text: string, props: Props) => {
    // then it is a command and we are testing
    const commandText = text.substring(1)
    const { commandName, commandArgs } = parseCommand(commandText)

    const args = {
      ...(props || {}),
      ...(commandArgs || {}),
    }

    const commands = {
      ...Object.assign({}, ...debugCommands.map((x) => ({ [x.name]: x.execute }))),
      all: (args: any) => {
        console.log(
          'all commands',
          debugCommands.map((c) => c.name)
        )
      },
    }
    const command = commands[commandName]

    if (!command) {
      console.log(`Unknown command: ${commandName}`)
      return
    }

    await command(args)
  }, [])

  return { isCommand, processCommand }
}
