import React from 'react'

interface ErrorOverlayProps {
  error: string | null
}

export const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ error }) => {
  if (!error) return null

  return (
    <div className="error-overlay">
      {error}
    </div>
  )
} 