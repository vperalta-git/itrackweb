'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { buildRolePath, getRoleFromPathname } from '@/lib/rbac'

// Mock vehicles for selection - Isuzu
const availableVehicles = [
  { id: '1', stockNumber: 'IP-2024-001', name: 'Isuzu mu-X LS-E 4x2 AT' },
  { id: '2', stockNumber: 'IP-2024-002', name: 'Isuzu D-Max LS 4x4 MT' },
  { id: '3', stockNumber: 'IP-2024-004', name: 'Isuzu Traviz L Utility Van' },
  { id: '4', stockNumber: 'IP-2024-007', name: 'Isuzu mu-X LS-A 4x4 AT' },
]

// Default checklist items
const defaultChecklistItems = [
  { id: '1', name: 'Exterior Wash & Wax', category: 'Cleaning' },
  { id: '2', name: 'Interior Vacuum & Clean', category: 'Cleaning' },
  { id: '3', name: 'Engine Bay Cleaning', category: 'Cleaning' },
  { id: '4', name: 'Tire Inspection & Pressure', category: 'Inspection' },
  { id: '5', name: 'Fluid Levels Check', category: 'Inspection' },
  { id: '6', name: 'Battery Test', category: 'Inspection' },
  { id: '7', name: 'Brake Inspection', category: 'Inspection' },
  { id: '8', name: 'Lights & Signals Test', category: 'Inspection' },
  { id: '9', name: 'AC System Test', category: 'Inspection' },
  { id: '10', name: 'Documentation Check', category: 'Documentation' },
  { id: '11', name: 'Keys & Accessories', category: 'Documentation' },
]

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export default function NewPreparationPage() {
  const router = useRouter()
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [isSaving, setIsSaving] = React.useState(false)
  const [selectedItems, setSelectedItems] = React.useState<string[]>(
    defaultChecklistItems.map((item) => item.id)
  )
  const [customItems, setCustomItems] = React.useState<string[]>([])
  const [newItemName, setNewItemName] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success('Preparation request created successfully')
      router.push(buildRolePath(role, 'preparation'))
    }, 1500)
  }

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  const addCustomItem = () => {
    if (newItemName.trim()) {
      setCustomItems((prev) => [...prev, newItemName.trim()])
      setNewItemName('')
    }
  }

  const removeCustomItem = (index: number) => {
    setCustomItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Group checklist items by category
  const groupedItems = defaultChecklistItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, typeof defaultChecklistItems>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Preparation Request"
        description="Create a vehicle preparation request with checklist items"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Request Details */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>
                Select the vehicle and set priority.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Vehicle *</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <span className="font-medium">{vehicle.stockNumber}</span>
                        <span className="text-muted-foreground ml-2">- {vehicle.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignee">Assign To</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team1">Preparation Team 1</SelectItem>
                    <SelectItem value="team2">Preparation Team 2</SelectItem>
                    <SelectItem value="team3">Detailing Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Checklist Items */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Preparation Checklist</CardTitle>
              <CardDescription>
                Select the items to include in this preparation request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={item.id}
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                        <Label
                          htmlFor={item.id}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {item.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Separator />

              {/* Custom Items */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Custom Items
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom checklist item..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomItem()
                      }
                    }}
                  />
                  <Button type="button" onClick={addCustomItem} size="icon">
                    <Plus className="size-4" />
                  </Button>
                </div>
                {customItems.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {customItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30"
                      >
                        <Checkbox defaultChecked />
                        <span className="flex-1 text-sm">{item}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeCustomItem(index)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
                <span>
                  {selectedItems.length + customItems.length} items selected
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() =>
                    setSelectedItems(defaultChecklistItems.map((item) => item.id))
                  }
                >
                  Select All Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 size-4" />
            {isSaving ? 'Creating...' : 'Create Request'}
          </Button>
        </div>
      </form>
    </div>
  )
}
