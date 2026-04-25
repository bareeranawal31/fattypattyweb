'use client'

import { toast as sonnerToast } from 'sonner'

type NotifyType = 'success' | 'error' | 'info' | 'warning' | 'default'

export type MessageLogItem = {
  id: string
  type: NotifyType
  message: string
  createdAt: string
}

const MESSAGE_LOG_KEY = 'fatty-patty:message-log'
const MAX_LOG_ITEMS = 120

const resolveMessage = (message: unknown): string => {
  if (typeof message === 'string') {
    return message
  }

  if (typeof message === 'number' || typeof message === 'boolean') {
    return String(message)
  }

  return 'Notification'
}

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const readMessageLog = (): MessageLogItem[] => {
  if (!canUseStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(MESSAGE_LOG_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeMessageLog = (items: MessageLogItem[]) => {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(MESSAGE_LOG_KEY, JSON.stringify(items.slice(0, MAX_LOG_ITEMS)))
    window.dispatchEvent(new CustomEvent('fatty-patty:message-log-updated'))
  } catch {
    // Ignore storage failures to avoid interrupting the checkout/auth flows.
  }
}

const pushMessageLog = (type: NotifyType, message: unknown) => {
  const messageText = resolveMessage(message).trim()
  if (!messageText) {
    return
  }

  const newItem: MessageLogItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    message: messageText,
    createdAt: new Date().toISOString(),
  }

  const items = readMessageLog()
  writeMessageLog([newItem, ...items])
}

export const messageLog = {
  key: MESSAGE_LOG_KEY,
  read: readMessageLog,
  clear: () => writeMessageLog([]),
}

export const toast = {
  success: (message: unknown, ...args: unknown[]) => {
    pushMessageLog('success', message)
    return sonnerToast.success(message as never, ...(args as []))
  },
  error: (message: unknown, ...args: unknown[]) => {
    pushMessageLog('error', message)
    return sonnerToast.error(message as never, ...(args as []))
  },
  info: (message: unknown, ...args: unknown[]) => {
    pushMessageLog('info', message)
    return sonnerToast.info(message as never, ...(args as []))
  },
  warning: (message: unknown, ...args: unknown[]) => {
    pushMessageLog('warning', message)
    return sonnerToast.warning(message as never, ...(args as []))
  },
  message: (message: unknown, ...args: unknown[]) => {
    pushMessageLog('default', message)
    return sonnerToast.message(message as never, ...(args as []))
  },
  dismiss: (...args: unknown[]) => sonnerToast.dismiss(...(args as [])),
  loading: (message: unknown, ...args: unknown[]) => {
    pushMessageLog('default', message)
    return sonnerToast.loading(message as never, ...(args as []))
  },
}