'use client'

import React from 'react'
import { useParams, redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function WorkflowRedirectPage() {
  const params = useParams()
  const supplierId = params.supplierId as string

  useEffect(() => {
    // Redirect to the new workflows path
    redirect(`/workflows/${supplierId}`)
  }, [supplierId])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Redirecting to workflow...</p>
      </div>
    </div>
  )
}
