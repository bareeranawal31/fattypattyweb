"use client"

import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Search, ShieldAlert, Trash2, UserRound } from 'lucide-react'
import { toast } from '@/lib/notify'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Customer {
  id: string
  name: string | null
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  total_orders: number
  total_spent: number
}

interface CustomerDetail extends Customer {
  orders: Array<{
    id: string
    order_number: string
    status: string
    total: number
    created_at: string
  }>
}

type StatusFilter = 'all' | 'active' | 'inactive'

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ search, status })
      const response = await fetch(`/api/admin/customers?${query.toString()}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to load customers')
      }
      setCustomers(result.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const response = await fetch(`/api/admin/customers/${id}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to load customer details')
      }
      setSelectedCustomer(result.data || null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load customer details')
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const totals = useMemo(() => {
    return customers.reduce(
      (acc, customer) => {
        acc.orders += customer.total_orders || 0
        acc.spent += Number(customer.total_spent || 0)
        return acc
      },
      { orders: 0, spent: 0 },
    )
  }, [customers])

  const updateCustomer = async (payload: Partial<Pick<Customer, 'is_active' | 'name' | 'phone'>>) => {
    if (!selectedCustomer) return
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/customers/${selectedCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to update customer')
      }
      setSelectedCustomer((prev) => (prev ? { ...prev, ...result.data } : prev))
      setCustomers((prev) => prev.map((c) => (c.id === result.data.id ? { ...c, ...result.data } : c)))
      toast.success('Customer updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update customer')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteCustomer = async () => {
    if (!selectedCustomer) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/customers/${selectedCustomer.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to delete customer')
      }

      setCustomers((prev) => prev.filter((customer) => customer.id !== selectedCustomer.id))
      setSelectedCustomer(null)
  setDeleteDialogOpen(false)
      toast.success('Customer deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete customer')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Management</h1>
          <p className="text-sm text-muted-foreground">Manage profiles, activity, and loyalty balances.</p>
        </div>
        <button
          onClick={fetchCustomers}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Customers</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{customers.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Orders</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totals.orders}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Customer Revenue</p>
          <p className="mt-1 text-2xl font-bold text-foreground">Rs. {totals.spent.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customer"
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={fetchCustomers}
                className="rounded-lg border border-border px-3 text-sm hover:bg-muted"
              >
                Go
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-3">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand-red" />
              </div>
            ) : customers.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No customers found.</p>
            ) : (
              customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => fetchCustomerDetail(customer.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${selectedCustomer?.id === customer.id ? 'border-brand-red bg-brand-red/5' : 'border-border hover:bg-muted/40'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{customer.name || 'Unnamed customer'}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${customer.is_active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Orders {customer.total_orders}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-3">
          {loadingDetail && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-brand-red" />
            </div>
          )}

          {!loadingDetail && !selectedCustomer && (
            <div className="py-12 text-center">
              <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Select a customer to view details.</p>
            </div>
          )}

          {!loadingDetail && selectedCustomer && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedCustomer.name || 'Unnamed customer'}</h2>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Joined {new Date(selectedCustomer.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => updateCustomer({ is_active: !selectedCustomer.is_active })}
                  disabled={isSaving}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${selectedCustomer.is_active ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'} disabled:opacity-60`}
                >
                  {selectedCustomer.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="text-lg font-bold text-foreground">{selectedCustomer.total_orders}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-bold text-foreground">Rs. {Number(selectedCustomer.total_spent || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Name</label>
                  <input
                    value={selectedCustomer.name || ''}
                    onChange={(event) => setSelectedCustomer((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Phone</label>
                  <input
                    value={selectedCustomer.phone || ''}
                    onChange={(event) => setSelectedCustomer((prev) => (prev ? { ...prev, phone: event.target.value } : prev))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => updateCustomer({ name: selectedCustomer.name || '', phone: selectedCustomer.phone || '' })}
                  disabled={isSaving}
                  className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  Save Profile
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground">Recent Orders</h3>
                <div className="mt-2 space-y-2">
                  {selectedCustomer.orders?.slice(0, 8).map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">Rs. {Number(order.total || 0).toLocaleString()}</p>
                        <p className="text-xs uppercase text-muted-foreground">{order.status}</p>
                      </div>
                    </div>
                  ))}
                  {(!selectedCustomer.orders || selectedCustomer.orders.length === 0) && (
                    <p className="text-xs text-muted-foreground">No orders found.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-xs font-semibold text-destructive">Danger Zone</p>
                <p className="mt-1 text-xs text-muted-foreground">Delete customer account and authentication identity.</p>
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isSaving}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Customer
                </button>
              </div>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete customer account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove {selectedCustomer.email} and related authentication identity. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteCustomer}
                      disabled={isSaving}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isSaving ? 'Deleting...' : 'Delete customer'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4" />
                  <p>Use account deactivation before deletion when possible to preserve order history.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
