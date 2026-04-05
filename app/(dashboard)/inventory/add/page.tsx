'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Save, RotateCcw } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

// Isuzu models only
const isuzuModels = ['mu-X', 'D-Max', 'Traviz', 'Crosswind', 'NLR', 'NMR', 'NPR', 'NQR', 'FRR', 'FVR']
const transmissions = ['Automatic', 'Manual']
const fuelTypes = ['Diesel']
const locations = ['Main Showroom', 'Service Bay', 'Truck Yard']

export default function AddVehiclePage() {
  const router = useRouter()
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success('Vehicle added successfully')
      router.push(buildRolePath(role, 'inventory'))
    }, 1500)
  }

  const handleReset = () => {
    // Reset form logic would go here
    toast.info('Form has been reset')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Vehicle"
        description="Enter the vehicle details to add it to your inventory"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Enter the basic details of the vehicle.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand} value={brand.toLowerCase()}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input id="model" placeholder="e.g., Camry, Civic" required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input id="year" type="number" placeholder="2024" min="1990" max="2030" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color *</Label>
                  <Input id="color" placeholder="e.g., Pearl White" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vin">VIN</Label>
                  <Input id="vin" placeholder="Vehicle Identification Number" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plateNumber">Plate Number</Label>
                  <Input id="plateNumber" placeholder="e.g., ABC 1234" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="engineNumber">Engine Number</Label>
                  <Input id="engineNumber" placeholder="Engine serial number" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card>
            <CardHeader>
              <CardTitle>Technical Specifications</CardTitle>
              <CardDescription>
                Vehicle technical details and features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="transmission">Transmission *</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transmission" />
                    </SelectTrigger>
                    <SelectContent>
                      {transmissions.map((trans) => (
                        <SelectItem key={trans} value={trans.toLowerCase()}>
                          {trans}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuelType">Fuel Type *</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((fuel) => (
                        <SelectItem key={fuel} value={fuel.toLowerCase()}>
                          {fuel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mileage">Mileage (km)</Label>
                  <Input id="mileage" type="number" placeholder="0" min="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="engineCapacity">Engine Capacity (cc)</Label>
                  <Input id="engineCapacity" type="number" placeholder="e.g., 2000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="features">Features</Label>
                <Textarea
                  id="features"
                  placeholder="List key features (e.g., Leather seats, Sunroof, Navigation)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Location */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Location</CardTitle>
              <CardDescription>
                Set the vehicle price and storage location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Selling Price (PHP) *</Label>
                  <Input id="price" type="number" placeholder="0" min="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Acquisition Cost (PHP)</Label>
                  <Input id="cost" type="number" placeholder="0" min="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Storage Location *</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc.toLowerCase().replace(/\s+/g, '-')}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>
                Any additional notes or remarks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter any additional notes about this vehicle..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier/Source</Label>
                <Input id="supplier" placeholder="Where was this vehicle acquired from?" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-6" />

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 size-4" />
            Reset
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="mr-2 size-4" />
            {isSaving ? 'Saving...' : 'Add Vehicle'}
          </Button>
        </div>
      </form>
    </div>
  )
}
