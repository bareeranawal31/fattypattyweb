'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

export function LoadingSpinner({
  size = 'md',
  text = 'Loading...',
  fullScreen = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Dual Ring Spinner */}
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizeClasses[size]} rounded-full border-4 border-muted spinner`} />
        {/* Inner ring - opposite direction */}
        <div className={`${sizeClasses[size]} absolute inset-0 rounded-full border-4 border-transparent border-t-[#C1121F] spinner-reverse`} />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#C1121F] bounce-ring" />
        </div>
      </div>

      {/* Loading Text */}
      {text && (
        <div className="flex flex-col items-center gap-2">
          <p className={`${textSizeClasses[size]} font-medium text-foreground`}>
            {text}
          </p>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-[#C1121F] animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-2 h-2 rounded-full bg-[#C1121F] animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="w-2 h-2 rounded-full bg-[#C1121F] animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}

// Smaller inline spinner for buttons/small spaces
export function LoadingSpinnerInline() {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative w-4 h-4">
        <div className="w-4 h-4 rounded-full border-2 border-muted spinner" />
        <div className="w-4 h-4 absolute inset-0 rounded-full border-2 border-transparent border-t-[#C1121F] spinner-reverse" />
      </div>
    </div>
  )
}
