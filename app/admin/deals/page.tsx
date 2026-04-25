"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { 
  Loader2, 
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Tag,
  Plus,
  Pencil,
  Trash2,
  X
} from 'lucide-react'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { setStorageWithSync } from '@/lib/storage-sync'

interface Deal {
  id: string
  name: string
  description: string | null
  items: string[]
  deal_type: string
  fixed_price: number | null
  discount_percentage: number | null
  is_active: boolean
  image_url: string | null
  valid_from: string
  valid_until: string | null
}

interface FormData {
  name: string
  description: string
  items: string[]
  selectedMenuItemId: string
  deal_type: string
  fixed_price: string
  discount_percentage: string
  valid_from: string
  valid_until: string
  image_url: string
}

const initialFormData: FormData = {
  name: '',
  description: '',
  items: [],
  selectedMenuItemId: '',
  deal_type: 'discount',
  fixed_price: '',
  discount_percentage: '',
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
  image_url: '',
}

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [menuOptions, setMenuOptions] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchDeals = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/menu')
      const data = await response.json()
      
      if (!response.ok) {
        console.error('API error:', data.error)
        toast.error(data.error || 'Failed to fetch deals')
        return
      }
      
      if (data.data?.deals) {
        setDeals(data.data.deals)
        setMenuOptions(
          (data.data.items || []).map((item: { id: string; name: string }) => ({
            id: item.id,
            name: item.name,
          }))
        )
        
        // Sync deals to localStorage for customer website
        const dealsForStorage = data.data.deals
          .filter((deal: Deal) => deal.is_active)
          .map((deal: Deal) => ({
            id: deal.id,
            name: deal.name,
            title: deal.description || deal.name,
            items: deal.items || [],
            price: deal.fixed_price || 0,
            image: deal.image_url || '/images/deals.jpg',
          }))
        setStorageWithSync('deals', JSON.stringify(dealsForStorage))
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
      toast.error('Failed to fetch deals')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDeals()
  }, [])

  const toggleDealStatus = async (id: string, currentStatus: boolean) => {
    setTogglingId(id)
    try {
      const response = await fetch(`/api/admin/menu/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'deal', is_available: !currentStatus }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      const updatedDeals = deals.map(deal => 
        deal.id === id ? { ...deal, is_active: !currentStatus } : deal
      )
      setDeals(updatedDeals)

      // Sync to localStorage with event dispatch
      const dealsForStorage = updatedDeals
        .filter(deal => deal.is_active)
        .map(deal => ({
          id: deal.id,
          name: deal.name,
          title: deal.description || deal.name,
          items: deal.items || [],
          price: deal.fixed_price || 0,
          image: deal.image_url || '/images/deals.jpg',
        }))
      setStorageWithSync('deals', JSON.stringify(dealsForStorage))

      toast.success(`Deal ${!currentStatus ? 'activated' : 'deactivated'}`)
    } catch {
      toast.error('Failed to update deal status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleAddDeal = () => {
    setEditingDeal(null)
    setFormData(initialFormData)
    setShowModal(true)
  }

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal)
    setFormData({
      name: deal.name,
      description: deal.description || '',
      items: deal.items || [],
      selectedMenuItemId: '',
      deal_type: deal.deal_type,
      fixed_price: deal.fixed_price?.toString() || '',
      discount_percentage: deal.discount_percentage?.toString() || '',
      valid_from: deal.valid_from?.split('T')[0] || '',
      valid_until: deal.valid_until?.split('T')[0] || '',
      image_url: deal.image_url || '',
    })
    setShowModal(true)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setIsUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      const data = await response.json()
      if (!response.ok || data.error) throw new Error(data.error || 'Failed to upload image')

      setFormData(prev => ({ ...prev, image_url: data.data.url }))
      toast.success('Image uploaded successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload image'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Deal name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingDeal
        ? `/api/admin/deals/${editingDeal.id}`
        : '/api/admin/deals'
      
      const method = editingDeal ? 'PATCH' : 'POST'

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        items: formData.items,
        deal_type: formData.deal_type,
        fixed_price: formData.fixed_price ? parseFloat(formData.fixed_price) : null,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
        image_url: formData.image_url || null,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
        is_active: editingDeal?.is_active ?? true,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      if (editingDeal) {
        setDeals(prev => prev.map(deal => 
          deal.id === editingDeal.id ? data.data : deal
        ))
        toast.success('Deal updated successfully')
      } else {
        setDeals(prev => [...prev, data.data])
        toast.success('Deal created successfully')
      }

      // Sync to localStorage
      const mergedDeals = editingDeal
        ? deals.map(d => (d.id === editingDeal.id ? data.data : d))
        : [...deals, data.data]

      const dealsForStorage = mergedDeals
        .filter(d => d.is_active)
        .map(d => ({
          id: d.id,
          name: d.name,
          title: d.description || d.name,
          items: d.items || [],
          price: d.fixed_price || 0,
          image: d.image_url || '/images/deals.jpg',
        }))
      setStorageWithSync('deals', JSON.stringify(dealsForStorage))

      setShowModal(false)
      setFormData(initialFormData)
      setEditingDeal(null)
    } catch (error) {
      console.error('[v0] Error saving deal:', error)
      toast.error('Failed to save deal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDeal = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/deals/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      const updatedDeals = deals.filter(deal => deal.id !== id)
      setDeals(updatedDeals)

      // Sync to localStorage
      const dealsForStorage = updatedDeals
        .filter(d => d.is_active)
        .map(d => ({
          id: d.id,
          name: d.name,
          title: d.description || d.name,
          items: d.items || [],
          price: d.fixed_price || 0,
          image: d.image_url || '/images/deals.jpg',
        }))
      setStorageWithSync('deals', JSON.stringify(dealsForStorage))

      setDeleteConfirm(null)
      toast.success('Deal deleted successfully')
    } catch (error) {
      console.error('[v0] Error deleting deal:', error)
      toast.error('Failed to delete deal')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const addSelectedItemToDeal = () => {
    if (!formData.selectedMenuItemId) {
      return
    }

    const selected = menuOptions.find(option => option.id === formData.selectedMenuItemId)
    if (!selected) {
      return
    }

    if (formData.items.includes(selected.name)) {
      toast.info('Item already added to this deal')
      return
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, selected.name],
      selectedMenuItemId: '',
    }))
  }

  const removeDealItem = (itemName: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item !== itemName),
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Deals Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage promotions and special offers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDeals}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleAddDeal}
            className="flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-brand-red/90"
          >
            <Plus className="h-4 w-4" />
            Add Deal
          </button>
        </div>
      </div>

      {/* Deals Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
        </div>
      ) : deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">No deals configured yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className={cn(
                "rounded-xl border bg-card overflow-hidden transition-all",
                deal.is_active ? "border-border" : "border-destructive/30 bg-destructive/5"
              )}
            >
              <div className="relative h-40">
                {deal.image_url ? (
                  <Image
                    src={deal.image_url}
                    alt={deal.name}
                    fill
                    className={cn("object-cover", !deal.is_active && "opacity-50")}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-red to-brand-gold">
                    <Tag className="h-12 w-12 text-primary-foreground" />
                  </div>
                )}
                {!deal.is_active && (
                  <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/50">
                    <span className="rounded-full bg-destructive px-3 py-1 text-xs font-medium text-primary-foreground">
                      Inactive
                    </span>
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <span className="rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-brand-dark">
                    {deal.name}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2">
                  <h3 className="font-semibold text-foreground">{deal.name}</h3>
                  {deal.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{deal.description}</p>
                  )}
                </div>
                
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{deal.deal_type}</span>
                  {deal.fixed_price && (
                    <span className="font-bold text-brand-red">Rs. {deal.fixed_price.toLocaleString()}</span>
                  )}
                  {deal.discount_percentage && (
                    <span className="font-bold text-brand-red">{deal.discount_percentage}% OFF</span>
                  )}
                </div>

                <div className="mb-3 text-xs text-muted-foreground">
                  Valid: {formatDate(deal.valid_from)}
                  {deal.valid_until && ` - ${formatDate(deal.valid_until)}`}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleDealStatus(deal.id, deal.is_active)}
                    disabled={togglingId === deal.id}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                      deal.is_active
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-red-100 text-red-800 hover:bg-red-200"
                    )}
                  >
                    {togglingId === deal.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : deal.is_active ? (
                      <>
                        <ToggleRight className="h-4 w-4" />
                        Active
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4" />
                        Inactive
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleEditDeal(deal)}
                    className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(deal.id)}
                    className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
          <div className="rounded-lg bg-card p-6 w-full max-w-md border border-border my-8">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {editingDeal ? 'Edit Deal' : 'Add New Deal'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Deal Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., Buy 2 Get 1 Free"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Add Products to Deal
                </label>
                <div className="flex gap-2">
                  <select
                    name="selectedMenuItemId"
                    value={formData.selectedMenuItemId}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red"
                  >
                    <option value="">Select product from menu</option>
                    {menuOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addSelectedItemToDeal}
                    className="rounded-lg border border-brand-red px-3 py-2 text-xs font-semibold text-brand-red hover:bg-brand-red/5"
                  >
                    Add
                  </button>
                </div>
                {formData.items.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.items.map(item => (
                      <span key={item} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-foreground">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeDealItem(item)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Deal Type *
                  </label>
                  <select
                    name="deal_type"
                    value={formData.deal_type}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red"
                  >
                    <option value="discount">Discount %</option>
                    <option value="combo">Combo</option>
                    <option value="bogo">Buy One Get One</option>
                    <option value="bundle">Bundle</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    {formData.deal_type === 'discount' ? 'Discount %' : 'Fixed Price'}
                  </label>
                  {formData.deal_type === 'discount' ? (
                    <input
                      type="number"
                      name="discount_percentage"
                      value={formData.discount_percentage}
                      onChange={handleFormChange}
                      placeholder="e.g., 20"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-red"
                    />
                  ) : (
                    <input
                      type="number"
                      name="fixed_price"
                      value={formData.fixed_price}
                      onChange={handleFormChange}
                      placeholder="e.g., 599"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-red"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Valid From *
                  </label>
                  <input
                    type="date"
                    name="valid_from"
                    value={formData.valid_from}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    name="valid_until"
                    value={formData.valid_until}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Deal Image
                </label>
                {formData.image_url && (
                  <div className="relative mb-2 h-32 rounded-lg overflow-hidden border border-input">
                    <Image
                      src={formData.image_url}
                      alt="Deal preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <span className="flex items-center justify-center rounded-lg border-2 border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:border-brand-red cursor-pointer disabled:opacity-50">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        Upload Image
                      </>
                    )}
                  </span>
                </label>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-red text-primary-foreground hover:bg-brand-red/90 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingDeal ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-card p-6 w-full max-w-sm border border-border">
            <h2 className="text-lg font-bold text-foreground mb-2">Delete Deal?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. The deal will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDeal(deleteConfirm)}
                className="px-4 py-2 rounded-lg bg-destructive text-primary-foreground hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
