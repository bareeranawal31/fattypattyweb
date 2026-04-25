"use client"

import { useEffect, useState, useCallback } from 'react'
import { 
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  description: string | null
  display_order: number
  created_at: string
  updated_at: string
}

interface FormData {
  name: string
  description: string
}

const initialFormData: FormData = {
  name: '',
  description: '',
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/categories')
      const data = await response.json()
      if (data.data) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('[v0] Error fetching categories:', error)
      toast.error('Failed to fetch categories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleAddCategory = () => {
    setEditingCategory(null)
    setFormData(initialFormData)
    setShowModal(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
    })
    setShowModal(true)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories'
      
      const method = editingCategory ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error)

      if (editingCategory) {
        // `data.data` will be the updated category object (PATCH route returns single)
        setCategories(prev => prev.map(cat => 
          cat.id === editingCategory.id ? data.data : cat
        ))
        toast.success('Category updated successfully')
      } else {
        // Because the POST route used to return an array, unwrap here just in case.
        const newCat = Array.isArray(data.data) ? data.data[0] : data.data
        setCategories(prev => [...prev, newCat])
        toast.success('Category created successfully')
      }

      setShowModal(false)
      setFormData(initialFormData)
    } catch (error) {
      console.error('[v0] Error saving category:', error)
      toast.error('Failed to save category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      setCategories(prev => prev.filter(cat => cat.id !== id))
      setDeleteConfirm(null)
      toast.success('Category deleted successfully')
    } catch (error) {
      console.error('[v0] Error deleting category:', error)
      toast.error('Failed to delete category')
    }
  }

  const handleReorderCategory = async (id: string, direction: 'up' | 'down') => {
    const index = categories.findIndex(cat => cat.id === id)
    if (index === -1) return

    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === categories.length - 1) return

    const newOrder = direction === 'up' 
      ? categories[index - 1].display_order 
      : categories[index + 1].display_order

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: newOrder }),
      })

      if (!response.ok) throw new Error('Failed to reorder')

      const newCategories = [...categories]
      if (direction === 'up') {
        [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]]
      } else {
        [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]]
      }
      setCategories(newCategories)
      toast.success('Category reordered')
    } catch (error) {
      console.error('[v0] Error reordering category:', error)
      toast.error('Failed to reorder category')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage food categories</p>
        </div>
        <button
          onClick={handleAddCategory}
          className="flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-brand-red/90"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No categories yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium">Description</th>
                <th className="text-center px-6 py-3 text-sm font-medium">Order</th>
                <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((category, idx) => (
                <tr key={category.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{category.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-muted-foreground truncate">
                      {category.description || '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleReorderCategory(category.id, 'up')}
                        disabled={idx === 0}
                        className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-muted-foreground min-w-6">{idx + 1}</span>
                      <button
                        onClick={() => handleReorderCategory(category.id, 'down')}
                        disabled={idx === categories.length - 1}
                        className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(category.id)}
                        className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-card p-6 w-full max-w-md border border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., Beef Burgers"
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
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div className="flex gap-2 justify-end">
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
                  {editingCategory ? 'Update' : 'Create'}
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
            <h2 className="text-lg font-bold text-foreground mb-2">Delete Category?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. All menu items in this category will be affected.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCategory(deleteConfirm)}
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
