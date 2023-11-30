export interface DebugCommand {
  name: string
  execute: (args: any) => Promise<void>
}
