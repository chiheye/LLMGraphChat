export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ChatResponse {
  message: string
  graphData?: {
    nodes: Array<{
      id: string
      label: string
      properties?: Record<string, any>
      [key: string]: any
    }>
    links: Array<{
      source: string | number
      target: string | number
      label?: string
      [key: string]: any
    }>
  }
  tableData?: {
    columns: string[]
    rows: Array<Record<string, any>>
  }
}

export interface Neo4jResult {
  nodes: Array<{
    id: string
    labels: string[]
    properties: Record<string, any>
  }>
  relationships: Array<{
    id: string
    type: string
    startNodeId: string
    endNodeId: string
    properties: Record<string, any>
  }>
}

