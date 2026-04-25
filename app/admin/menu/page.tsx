"use client"

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { 
  Search, 
  Filter, 
  Loader2, 
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Plus,
  X,
  Upload,
  Pencil,
  Trash2
} from 'lucide-react'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { setStorageWithSync } from '@/lib/storage-sync'

interface Category {
  id: string
  name: string
  slug: string
  is_active: boolean
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  category_id: string
  category?: { name: string }
}

interface FormData {
  name: string
  description: string
  price: string
  category_id: string
  image_url: string
  is_available: boolean
}

const initialFormData: FormData = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
  is_available: true,
}

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const buildProductsForStorage = (menuItems: MenuItem[]) => {
    return menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category_id,
      category_id: item.category_id,
      category_name: item.category?.name || item.category_id,
      image: item.image_url || '/images/placeholder.jpg',
      image_url: item.image_url,
      is_available: item.is_available,
      rating: 4.5,
    }))
  }

  const fetchMenu = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/menu')
      const data = await response.json()
      
      if (!response.ok) {
        console.error('API error:', data.error)
        toast.error(data.error || 'Failed to fetch menu')
        return
      }
      
      if (data.data) {
        setCategories(data.data.categories || [])
        setItems(data.data.items || [])
        
        // Sync products to localStorage for customer menu
        const productsForStorage = buildProductsForStorage(data.data.items || [])
        setStorageWithSync('menuItems', JSON.stringify(productsForStorage))
      }
    } catch (error) {
      console.error('Error fetching menu:', error)
      toast.error('Failed to fetch menu')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setTogglingId(id)
    try {
      const response = await fetch(`/api/admin/menu/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'item', is_available: !currentStatus }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      const updatedItems = items.map(item => 
        item.id === id ? { ...item, is_available: !currentStatus } : item
      )
      setItems(updatedItems)

      // Sync updated items to localStorage
      const productsForStorage = buildProductsForStorage(updatedItems)
      setStorageWithSync('menuItems', JSON.stringify(productsForStorage))

      toast.success(`Item ${!currentStatus ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error('Failed to update availability')
    } finally {
      setTogglingId(null)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (5MB max)
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

  const openAddModal = () => {
    setEditingItem(null)
    setFormData(initialFormData)
    setShowModal(true)
  }

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id,
      image_url: item.image_url || '',
      is_available: item.is_available,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.price || !formData.category_id) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        ...(editingItem && { id: editingItem.id }),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        category_id: formData.category_id,
        image_url: formData.image_url || null,
        is_available: formData.is_available,
      }

      const response = await fetch('/api/admin/menu', {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      let updatedItems: MenuItem[]
      if (editingItem) {
        updatedItems = items.map(item => 
          item.id === editingItem.id ? data.data : item
        )
        setItems(updatedItems)
        toast.success('Menu item updated successfully')
      } else {
        updatedItems = [...items, data.data]
        setItems(updatedItems)
        toast.success('Menu item created successfully')
      }

      // Also save to localStorage for customer menu sync
      const productsForStorage = buildProductsForStorage(updatedItems)
      setStorageWithSync('menuItems', JSON.stringify(productsForStorage))

      setShowModal(false)
      setFormData(initialFormData)
      setEditingItem(null)
    } catch {
      toast.error(editingItem ? 'Failed to update item' : 'Failed to create item')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/menu?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      const updatedItems = items.filter(item => item.id !== id)
      setItems(updatedItems)
      
      // Sync to localStorage
      const productsForStorage = buildProductsForStorage(updatedItems)
      setStorageWithSync('menuItems', JSON.stringify(productsForStorage))
      
      toast.success('Menu item deleted successfully')
      setDeleteConfirm(null)
    } catch {
      toast.error('Failed to delete item')
    }
  }

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Menu Management</h1>
          <p className="text-sm text-muted-foreground">Manage menu items and availability</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMenu}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-brand-red/90"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="appearance-none rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Menu Items Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No menu items found</p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-brand-red/90"
          >
            <Plus className="h-4 w-4" />
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-xl border bg-card overflow-hidden transition-all",
                item.is_available ? "border-border" : "border-destructive/30 bg-destructive/5"
              )}
            >
              <div className="relative h-40">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className={cn("object-cover", !item.is_available && "opacity-50")}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <span className="text-muted-foreground">No image</span>
                  </div>
                )}
                {!item.is_available && (
                  <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/50">
                    <span className="rounded-full bg-destructive px-3 py-1 text-xs font-medium text-primary-foreground">
                      Unavailable
                    </span>
                  </div>
                )}
                {/* Action buttons */}
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="rounded-lg bg-background/80 p-2 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="rounded-lg bg-background/80 p-2 text-destructive backdrop-blur-sm transition-colors hover:bg-background"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">{item.category?.name}</p>
                  </div>
                  <span className="flex-shrink-0 font-bold text-brand-red">
                    Rs. {item.price.toLocaleString()}
                  </span>
                </div>
                {item.description && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                )}
                <button
                  onClick={() => toggleAvailability(item.id, item.is_available)}
                  disabled={togglingId === item.id}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    item.is_available
                      ? "bg-green-100 text-green-800 hover:bg-green-200"
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  )}
                >
                  {togglingId === item.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : item.is_available ? (
                    <>
                      <ToggleRight className="h-4 w-4" />
                      Available
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4" />
                      Unavailable
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-lg font-bold text-foreground">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setFormData(initialFormData)
                  setEditingItem(null)
                }}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Product Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-border bg-muted/40">
                    {formData.image_url ? (
                      <Image
                        src={formData.image_url}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                    {formData.image_url && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-primary-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-brand-red hover:bg-muted">
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="mt-1 text-xs text-muted-foreground">{formData.image_url ? 'Replace' : 'Upload'}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  <div className="text-xs text-muted-foreground">
                    <p>Recommended: 400x300px</p>
                    <p>Max size: 5MB</p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-foreground">
                  Product Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  placeholder="Enter product name"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  placeholder="Enter product description"
                />
              </div>

              {/* Category and Price */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="category" className="mb-2 block text-sm font-medium text-foreground">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="category"
                    required
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="price" className="mb-2 block text-sm font-medium text-foreground">
                    Price (Rs.) <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="price"
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Availability */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_available: !prev.is_available }))}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    formData.is_available ? "bg-green-500" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      formData.is_available ? "left-5" : "left-0.5"
                    )}
                  />
                </button>
                <span className="text-sm text-foreground">
                  {formData.is_available ? 'Available' : 'Unavailable'}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-red py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-brand-red/90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingItem ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingItem ? 'Update Menu Item' : 'Add Menu Item'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-foreground">Delete Menu Item</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-lg bg-destructive py-2.5 text-sm font-medium text-primary-foreground hover:bg-destructive/90"
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
