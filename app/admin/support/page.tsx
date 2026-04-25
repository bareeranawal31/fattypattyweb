"use client"

import { useEffect, useState } from 'react'
import { Loader2, MessageSquareMore, Send } from 'lucide-react'
import { toast } from '@/lib/notify'

interface SupportTicket {
  id: string
  customer_id?: string
  customer_email: string
  customer_name: string | null
  subject: string
  message: string
  ticket_type: 'query' | 'complaint' | 'request'
  status: 'open' | 'answered' | 'closed'
  admin_reply: string | null
  created_at: string
  reply_at: string | null
}

const ALL_TICKETS_KEY = 'support-tickets:all'

function getUserTicketsKey(userId: string) {
  return `support-tickets:${userId}`
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [activeStatus, setActiveStatus] = useState<'all' | 'open' | 'answered' | 'closed'>('all')
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null)

  const loadTickets = async () => {
    setIsLoading(true)
    try {
      const url =
        activeStatus === 'all' ? '/api/admin/support' : `/api/admin/support?status=${activeStatus}`
      const response = await fetch(url)
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch tickets')
      }
      setTickets((result.data || []) as SupportTicket[])
    } catch (error) {
      try {
        const allTicketsRaw = localStorage.getItem(ALL_TICKETS_KEY)
        const allTickets = allTicketsRaw ? (JSON.parse(allTicketsRaw) as SupportTicket[]) : []
        const filtered =
          activeStatus === 'all'
            ? allTickets
            : allTickets.filter((ticket) => ticket.status === activeStatus)

        setTickets(filtered)
      } catch {
        const message = error instanceof Error ? error.message : 'Failed to load support tickets'
        toast.error(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [activeStatus])

  const saveReply = async (ticketId: string) => {
    const adminReply = (replies[ticketId] || '').trim()
    if (!adminReply) {
      toast.error('Reply cannot be empty')
      return
    }

    setSavingTicketId(ticketId)
    try {
      const response = await fetch(`/api/admin/support/${ticketId}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply, status: 'answered' }),
      })

      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to save reply')
      }

      toast.success('Reply saved successfully')
      setReplies((prev) => ({ ...prev, [ticketId]: '' }))
      loadTickets()
    } catch (error) {
      try {
        const allTicketsRaw = localStorage.getItem(ALL_TICKETS_KEY)
        const allTickets = allTicketsRaw ? (JSON.parse(allTicketsRaw) as SupportTicket[]) : []
        const replyTimestamp = new Date().toISOString()

        const updatedAllTickets = allTickets.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                admin_reply: adminReply,
                status: 'answered' as const,
                reply_at: replyTimestamp,
              }
            : ticket,
        )

        localStorage.setItem(ALL_TICKETS_KEY, JSON.stringify(updatedAllTickets))

        const target = updatedAllTickets.find((ticket) => ticket.id === ticketId)
        if (target?.customer_id) {
          const userTicketsKey = getUserTicketsKey(target.customer_id)
          const userTicketsRaw = localStorage.getItem(userTicketsKey)
          const userTickets = userTicketsRaw ? (JSON.parse(userTicketsRaw) as SupportTicket[]) : []
          const updatedUserTickets = userTickets.map((ticket) =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  admin_reply: adminReply,
                  status: 'answered' as const,
                  reply_at: replyTimestamp,
                }
              : ticket,
          )
          localStorage.setItem(userTicketsKey, JSON.stringify(updatedUserTickets))
        }

        toast.success('Reply saved successfully')
        setReplies((prev) => ({ ...prev, [ticketId]: '' }))
        loadTickets()
      } catch {
        const message = error instanceof Error ? error.message : 'Failed to save reply'
        toast.error(message)
      }
    } finally {
      setSavingTicketId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Support</h1>
          <p className="text-sm text-muted-foreground">Respond to customer queries, complaints, and requests.</p>
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'open', 'answered', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${
                activeStatus === status
                  ? 'bg-brand-red text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No support tickets found.
            </div>
          )}

          {tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">{ticket.subject}</h3>
                  <p className="text-xs text-muted-foreground">
                    {ticket.customer_name || ticket.customer_email} • {ticket.customer_email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {ticket.ticket_type}
                  </span>
                  <span className="rounded-full bg-brand-red/10 px-2.5 py-1 text-xs font-medium text-brand-red">
                    {ticket.status}
                  </span>
                </div>
              </div>

              <p className="mt-3 rounded-lg bg-background p-3 text-sm text-foreground/85">{ticket.message}</p>

              {ticket.admin_reply && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Current Reply</p>
                  <p className="mt-1 text-sm text-emerald-900">{ticket.admin_reply}</p>
                </div>
              )}

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {ticket.admin_reply ? 'Update Reply' : 'Write Reply'}
                </label>
                <textarea
                  rows={3}
                  value={replies[ticket.id] ?? ''}
                  onChange={(e) => setReplies((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                  placeholder="Type your response for customer profile..."
                  className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                />
                <button
                  onClick={() => saveReply(ticket.id)}
                  disabled={savingTicketId === ticket.id}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-brand-red/90 disabled:opacity-60"
                >
                  {savingTicketId === ticket.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Save Reply
                </button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                <MessageSquareMore className="mr-1 inline h-3.5 w-3.5" />
                Submitted: {new Date(ticket.created_at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
