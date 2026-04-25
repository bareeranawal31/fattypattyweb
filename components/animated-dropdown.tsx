'use client'

import { ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AnimatedDropdownProps {
  label: string
  children: ReactNode
  icon?: ReactNode
  defaultOpen?: boolean
}

export function AnimatedDropdown({
  label,
  children,
  icon,
  defaultOpen = false
}: AnimatedDropdownProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
      >
        {icon}
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 dropdown-open"
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownMenuProps {
  items: Array<{
    label: string
    onClick: () => void
    icon?: ReactNode
    disabled?: boolean
  }>
}

export function DropdownMenu({ items }: DropdownMenuProps) {
  return (
    <div className="py-1 space-y-1">
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={item.onClick}
          disabled={item.disabled}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {item.icon && (
            <span className="text-muted-foreground group-hover:text-[#C1121F] transition-colors">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Simple tooltip with dropdown animation
 */
interface AnimatedTooltipProps {
  trigger: ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function AnimatedTooltip({
  trigger,
  content,
  position = 'top'
}: AnimatedTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2'
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {trigger}
      </div>

      {isVisible && (
        <div
          className={`${positionClasses[position]} absolute px-3 py-2 bg-foreground text-background text-xs rounded-md whitespace-nowrap dropdown-open`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
