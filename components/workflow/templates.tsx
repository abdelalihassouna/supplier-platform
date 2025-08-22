// templates.tsx
import React from 'react'
import { NodeTemplate } from './types'
import { Play, Shield, Building2, Award, FileCheck, Briefcase, AlertTriangle, CheckCircle } from 'lucide-react'

export const nodeTemplates: NodeTemplate[] = [
  {
    templateKey: 'start',
    type: 'start',
    label: 'Start',
    icon: <Play className="w-5 h-5" />,
    description: 'Workflow starting point',
  },
  {
    templateKey: 'verification:DURC',
    type: 'verification',
    verificationType: 'DURC',
    label: 'DURC Verification',
    icon: <Shield className="w-5 h-5" />,
    description: 'Verify DURC document compliance',
  },
  {
    templateKey: 'verification:VISURA',
    type: 'verification',
    verificationType: 'VISURA',
    label: 'VISURA Verification',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Verify company registration data',
  },
  {
    templateKey: 'verification:SOA',
    type: 'verification',
    verificationType: 'SOA',
    label: 'SOA Verification',
    icon: <Award className="w-5 h-5" />,
    description: 'Verify SOA attestation',
  },
  {
    templateKey: 'verification:ISO',
    type: 'verification',
    verificationType: 'ISO',
    label: 'ISO Verification',
    icon: <FileCheck className="w-5 h-5" />,
    description: 'Verify ISO certification',
  },
  {
    templateKey: 'verification:CCIAA',
    type: 'verification',
    verificationType: 'CCIAA',
    label: 'CCIAA Verification',
    icon: <Briefcase className="w-5 h-5" />,
    description: 'Verify Chamber of Commerce data',
  },
  {
    templateKey: 'decision',
    type: 'decision',
    label: 'Decision Point',
    icon: <AlertTriangle className="w-5 h-5" />,
    description: 'Conditional workflow branching',
  },
  {
    templateKey: 'end',
    type: 'end',
    label: 'End',
    icon: <CheckCircle className="w-5 h-5" />,
    description: 'Workflow completion point',
  },
]

export const getTemplateByKey = (key: string) => nodeTemplates.find((t) => t.templateKey === key)