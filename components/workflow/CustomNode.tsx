// CustomNode.tsx
import React from 'react'
import { Handle, Position } from 'reactflow'
import { BuilderNodeData, NODE_BG } from './types'
import { Shield, Building2, Award, FileCheck, Briefcase, Play, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

const getNodeIcon = (data: BuilderNodeData) => {
  switch (data.verificationType || data.type) {
    case 'DURC':
      return <Shield className="w-4 h-4" />
    case 'VISURA':
      return <Building2 className="w-4 h-4" />
    case 'SOA':
      return <Award className="w-4 h-4" />
    case 'ISO':
      return <FileCheck className="w-4 h-4" />
    case 'CCIAA':
      return <Briefcase className="w-4 h-4" />
    case 'start':
      return <Play className="w-4 h-4" />
    case 'end':
      return <CheckCircle className="w-4 h-4" />
    case 'decision':
      return <AlertTriangle className="w-4 h-4" />
    default:
      return <Clock className="w-4 h-4" />
  }
}

export const BuilderNode = ({ data, selected }: { data: BuilderNodeData; selected: boolean }) => {
  const nodeColor = NODE_BG[data.type] ?? 'bg-gray-100 border-gray-300'

  return (
    <div
      className={`px-3 py-2 shadow-md rounded-md border-2 ${nodeColor} ${selected ? 'ring-2 ring-blue-500' : ''} relative`}
      role="group"
      aria-label={`${data.type} node: ${data.label}`}
    >
      {data.type !== 'start' && (
        <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400 border-2 border-white" aria-label="Incoming connection" />
      )}

      <div className="flex items-center gap-2">
        {getNodeIcon(data)}
        <div className="text-sm font-medium leading-none">{data.label}</div>
      </div>

      {data.verificationType && <div className="text-xs text-gray-600 mt-1">{data.verificationType}</div>}

      {data.type !== 'end' && (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-gray-400 border-2 border-white" aria-label="Outgoing connection" />
      )}

      {data.type === 'decision' && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="yes"
            className="w-3 h-3 !bg-green-400 border-2 border-white"
            aria-label="Yes branch"
          />
          <Handle type="source" position={Position.Left} id="no" className="w-3 h-3 !bg-red-400 border-2 border-white" aria-label="No branch" />
        </>
      )}
    </div>
  )
}