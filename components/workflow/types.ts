// types.ts
export type NodeKind = 'start' | 'verification' | 'decision' | 'end'
export type VerificationKind = 'DURC' | 'VISURA' | 'SOA' | 'ISO' | 'CCIAA'

export interface BuilderNodeData {
  id: string
  label: string
  type: NodeKind
  verificationType?: VerificationKind
  analysisId?: string
  config?: {
    timeout?: number
    retries?: number
    required?: boolean
    description?: string
  }
  [key: string]: unknown
}

export interface NodeTemplate {
  templateKey: string // e.g. "start" or "verification:ISO"
  type: NodeKind
  label: string
  description: string
  verificationType?: VerificationKind
  icon: React.ReactNode
}

export const NODE_BG: Record<NodeKind, string> = {
  start: 'bg-green-100 border-green-300',
  end: 'bg-red-100 border-red-300',
  decision: 'bg-yellow-100 border-yellow-300',
  verification: 'bg-blue-100 border-blue-300',
}