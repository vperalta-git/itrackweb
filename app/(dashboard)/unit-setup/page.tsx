'use client'

import * as React from 'react'
import {
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Layers3,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmActionDialog } from '@/components/confirm-action-dialog'
import { BodyColorChip } from '@/components/body-color-chip'
import { PageHeader } from '@/components/page-header'
import { SearchableSelect } from '@/components/searchable-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  normalizeUnitSetupValue,
  loadUnitSetupConfig,
  saveUnitSetupConfig,
  subscribeToUnitSetup,
  type UnitSetupRecord,
  type UnitSetupVariation,
} from '@/lib/unit-setup-data'

type UnitEditorState = {
  originalUnitName: string | null
  unitName: string
  variations: UnitSetupVariation[]
}

type PendingDeleteState =
  | {
      title: string
      description: string
      onConfirm: () => void
    }
  | null

const emptyVariation = (): UnitSetupVariation => ({
  name: '',
  bodyColors: [],
  transmission: '',
  drivetrain: '',
  bodyType: '',
})

const emptyEditorState: UnitEditorState = {
  originalUnitName: null,
  unitName: '',
  variations: [emptyVariation()],
}

function matchesSearch(unit: UnitSetupRecord, query: string) {
  if (!query) return true

  const normalizedQuery = normalizeUnitSetupValue(query)

  if (normalizeUnitSetupValue(unit.unitName).includes(normalizedQuery)) {
    return true
  }

  return unit.variations.some((variation) => {
    const searchableValues = [
      variation.name,
      variation.transmission,
      variation.drivetrain,
      variation.bodyType,
      ...variation.bodyColors,
    ]

    return searchableValues.some((value) =>
      normalizeUnitSetupValue(value ?? '').includes(normalizedQuery)
    )
  })
}

export default function UnitSetupPage() {
  const [unitSetup, setUnitSetup] = React.useState<UnitSetupRecord[]>(() => loadUnitSetupConfig())
  const [query, setQuery] = React.useState('')
  const [focusedUnitName, setFocusedUnitName] = React.useState('')
  const [expandedUnits, setExpandedUnits] = React.useState<string[]>([])
  const [currentPage, setCurrentPage] = React.useState(1)
  const [isEditorOpen, setIsEditorOpen] = React.useState(false)
  const [editorState, setEditorState] = React.useState<UnitEditorState>(emptyEditorState)
  const [colorInputs, setColorInputs] = React.useState<Record<number, string>>({})
  const [pendingDelete, setPendingDelete] = React.useState<PendingDeleteState>(null)
  const unitsPerPage = 6

  React.useEffect(() => subscribeToUnitSetup(setUnitSetup), [])

  const sortedUnitSetup = React.useMemo(
    () => [...unitSetup].sort((left, right) => left.unitName.localeCompare(right.unitName)),
    [unitSetup]
  )

  const filteredUnits = React.useMemo(() => {
    return sortedUnitSetup.filter((unit) => {
      const matchesUnit = focusedUnitName ? unit.unitName === focusedUnitName : true
      return matchesUnit && matchesSearch(unit, query)
    })
  }, [focusedUnitName, query, sortedUnitSetup])

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / unitsPerPage))

  const paginatedUnits = React.useMemo(() => {
    const start = (currentPage - 1) * unitsPerPage
    return filteredUnits.slice(start, start + unitsPerPage)
  }, [currentPage, filteredUnits])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [query, focusedUnitName])

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const totalVariations = React.useMemo(
    () => unitSetup.reduce((count, unit) => count + unit.variations.length, 0),
    [unitSetup]
  )

  const totalColorAssignments = React.useMemo(
    () =>
      unitSetup.reduce(
        (count, unit) =>
          count +
          unit.variations.reduce(
            (variationCount, variation) => variationCount + variation.bodyColors.length,
            0
          ),
        0
      ),
    [unitSetup]
  )

  const unitOptions = React.useMemo(
    () =>
      sortedUnitSetup.map((unit) => ({
        value: unit.unitName,
        keywords: unit.variations.flatMap((variation) => [
          variation.name,
          ...variation.bodyColors,
        ]),
      })),
    [sortedUnitSetup]
  )

  const persistUnitSetup = React.useCallback((nextConfig: UnitSetupRecord[]) => {
    const saved = saveUnitSetupConfig(nextConfig)
    setUnitSetup(saved)
    return saved
  }, [])

  const toggleExpanded = React.useCallback((unitName: string) => {
    setExpandedUnits((current) =>
      current.includes(unitName)
        ? current.filter((value) => value !== unitName)
        : [...current, unitName]
    )
  }, [])

  const handleOpenCreate = React.useCallback(() => {
    setEditorState(emptyEditorState)
    setColorInputs({})
    setIsEditorOpen(true)
  }, [])

  const handleOpenEdit = React.useCallback((unit: UnitSetupRecord) => {
    setEditorState({
      originalUnitName: unit.unitName,
      unitName: unit.unitName,
      variations: unit.variations.map((variation) => ({
        ...variation,
        bodyColors: [...variation.bodyColors],
      })),
    })
    setColorInputs({})
    setIsEditorOpen(true)
  }, [])

  const handleAddVariation = React.useCallback(() => {
    setEditorState((current) => ({
      ...current,
      variations: [...current.variations, emptyVariation()],
    }))
  }, [])

  const handleVariationFieldChange = React.useCallback(
    (index: number, field: keyof UnitSetupVariation, value: string | string[]) => {
      setEditorState((current) => ({
        ...current,
        variations: current.variations.map((variation, variationIndex) =>
          variationIndex === index ? { ...variation, [field]: value } : variation
        ),
      }))
    },
    []
  )

  const handleAddColors = React.useCallback(
    (variationIndex: number) => {
      const rawValue = colorInputs[variationIndex] ?? ''
      const candidates = rawValue
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean)

      if (candidates.length === 0) return

      let addedCount = 0

      setEditorState((current) => ({
        ...current,
        variations: current.variations.map((variation, index) => {
          if (index !== variationIndex) return variation

          const existing = new Set(
            variation.bodyColors.map((color) => normalizeUnitSetupValue(color))
          )
          const nextColors = [...variation.bodyColors]

          for (const candidate of candidates) {
            const key = normalizeUnitSetupValue(candidate)
            if (!key || existing.has(key)) continue
            existing.add(key)
            nextColors.push(candidate)
            addedCount += 1
          }

          return {
            ...variation,
            bodyColors: nextColors,
          }
        }),
      }))

      setColorInputs((current) => ({ ...current, [variationIndex]: '' }))

      if (addedCount === 0) {
        toast.error('Those body colors already exist for this variation.')
      }
    },
    [colorInputs]
  )

  const handleSaveUnit = React.useCallback(() => {
    const unitName = editorState.unitName.trim()
    const normalizedUnitName = normalizeUnitSetupValue(unitName)

    if (!unitName) {
      toast.error('Unit name is required.')
      return
    }

    const unitExists = unitSetup.some(
      (unit) =>
        normalizeUnitSetupValue(unit.unitName) === normalizedUnitName &&
        unit.unitName !== editorState.originalUnitName
    )

    if (unitExists) {
      toast.error('This unit name already exists.')
      return
    }

    if (editorState.variations.length === 0) {
      toast.error('Add at least one variation before saving.')
      return
    }

    const seenVariations = new Set<string>()

    for (const variation of editorState.variations) {
      const variationName = variation.name.trim()
      const normalizedVariationName = normalizeUnitSetupValue(variationName)

      if (!variationName) {
        toast.error('Every variation needs a name.')
        return
      }

      if (seenVariations.has(normalizedVariationName)) {
        toast.error('Duplicate variation names are not allowed under the same unit.')
        return
      }

      seenVariations.add(normalizedVariationName)

      if (variation.bodyColors.length === 0) {
        toast.error(`Add at least one body color for ${variationName}.`)
        return
      }
    }

    const draft: UnitSetupRecord = {
      unitName,
      variations: editorState.variations.map((variation) => ({
        ...variation,
        name: variation.name.trim(),
        transmission: variation.transmission?.trim(),
        drivetrain: variation.drivetrain?.trim(),
        bodyType: variation.bodyType?.trim(),
        bodyColors: variation.bodyColors.map((bodyColor) => bodyColor.trim()).filter(Boolean),
      })),
    }

    const nextConfig = editorState.originalUnitName
      ? unitSetup.map((unit) =>
          unit.unitName === editorState.originalUnitName ? draft : unit
        )
      : [...unitSetup, draft]

    const saved = persistUnitSetup(nextConfig)

    setExpandedUnits((current) => {
      const next = current.filter((value) => value !== editorState.originalUnitName)
      return next.includes(draft.unitName) ? next : [...next, draft.unitName]
    })
    setFocusedUnitName(draft.unitName)
    setIsEditorOpen(false)
    setEditorState(emptyEditorState)
    setColorInputs({})

    toast.success(
      editorState.originalUnitName
        ? `Updated ${draft.unitName} with ${draft.variations.length} variations.`
        : `Added ${draft.unitName} to Unit Setup.`
    )

    if (saved.length === 0) {
      setFocusedUnitName('')
    }
  }, [editorState, persistUnitSetup, unitSetup])

  const handleDeleteUnit = React.useCallback(
    (unit: UnitSetupRecord) => {
      setPendingDelete({
        title: 'Delete unit setup',
        description: `Remove ${unit.unitName} and all of its variations and body colors from the dropdown configuration? Existing stock records will remain, but new entries will no longer be able to select these combinations.`,
        onConfirm: () => {
          persistUnitSetup(unitSetup.filter((entry) => entry.unitName !== unit.unitName))
          setExpandedUnits((current) => current.filter((value) => value !== unit.unitName))
          setFocusedUnitName((current) => (current === unit.unitName ? '' : current))
          toast.success(`${unit.unitName} was removed from Unit Setup.`)
        },
      })
    },
    [persistUnitSetup, unitSetup]
  )

  const confirmDeleteVariation = React.useCallback((variationIndex: number) => {
    const variationName = editorState.variations[variationIndex]?.name || 'this variation'

    setPendingDelete({
      title: 'Delete variation',
      description: `Remove ${variationName} and all of its body colors from the current unit setup draft?`,
      onConfirm: () => {
        setEditorState((current) => ({
          ...current,
          variations: current.variations.filter((_, index) => index !== variationIndex),
        }))
        setColorInputs({})
      },
    })
  }, [editorState.variations])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unit Setup"
        description="Centralize the unit, variation, and body color combinations used in Add New Vehicle."
      >
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="mr-2 size-4" />
          Add Unit
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Configured Units</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{unitSetup.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Available in Vehicle Stocks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Variations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalVariations}</p>
            <p className="mt-1 text-xs text-muted-foreground">Linked beneath each unit name</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Color Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalColorAssignments}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Variation-specific body color options
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Find a unit quickly or narrow the list to a specific model family.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1.2fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="unit-search">Search setup</Label>
            <Input
              id="unit-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search units, variations, colors, drivetrain..."
            />
          </div>
          <div className="space-y-2">
            <Label>Jump to unit</Label>
            <SearchableSelect
              value={focusedUnitName}
              onValueChange={setFocusedUnitName}
              options={unitOptions}
              placeholder="All units"
              searchPlaceholder="Find a unit..."
              emptyText="No unit found."
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery('')
                setFocusedUnitName('')
              }}
              className="w-full md:w-auto"
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Saved Unit Configuration</CardTitle>
          <CardDescription>
            These values directly power the Unit Name, Variation, and Body Color dropdowns in Add
            New Vehicle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_100px_100px_96px] items-center gap-4 border-y bg-muted/40 px-6 py-3 text-sm font-medium text-muted-foreground lg:grid">
          <span>Unit Name</span>
          <span>Variations</span>
          <span>Colors</span>
          <span className="text-right">Actions</span>
        </div>
        {filteredUnits.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No unit setup matches your current filters. Try clearing the search or add a new unit.
          </div>
        ) : (
          paginatedUnits.map((unit) => {
            const totalColors = unit.variations.reduce(
              (count, variation) => count + variation.bodyColors.length,
              0
            )
            const isExpanded = expandedUnits.includes(unit.unitName)

            return (
              <div key={unit.unitName} className="border-b last:border-b-0">
                <div className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_100px_100px_96px] lg:items-center">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(unit.unitName)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4 text-primary" />
                    ) : (
                      <ChevronRight className="size-4 text-primary" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{unit.unitName}</p>
                      <p className="text-sm text-muted-foreground">
                        Dropdown source for stock entry
                      </p>
                    </div>
                  </button>
                  <div className="grid grid-cols-2 gap-3 sm:max-w-xs lg:contents">
                    <div className="rounded-lg border bg-muted/20 px-3 py-2 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground lg:hidden">
                        Variations
                      </p>
                      <span className="text-sm font-medium">{unit.variations.length}</span>
                    </div>
                    <div className="rounded-lg border bg-muted/20 px-3 py-2 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground lg:hidden">
                        Colors
                      </p>
                      <span className="text-sm font-medium">{totalColors}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end lg:justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(unit)}>
                          <Pencil className="size-4" />
                          Edit unit setup
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteUnit(unit)}
                          variant="destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete unit setup
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-3 bg-muted/20 px-4 py-4 sm:px-6">
                    {unit.variations.map((variation) => (
                      <div
                        key={`${unit.unitName}-${variation.name}`}
                        className="rounded-xl border bg-background p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Layers3 className="size-4 text-primary" />
                              <p className="font-semibold text-foreground">{variation.name}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {variation.transmission ? (
                                <Badge variant="secondary">{variation.transmission}</Badge>
                              ) : null}
                              {variation.drivetrain ? (
                                <Badge variant="secondary">{variation.drivetrain}</Badge>
                              ) : null}
                              {variation.bodyType ? (
                                <Badge variant="secondary">{variation.bodyType}</Badge>
                              ) : null}
                            </div>
                          </div>
                          <Badge variant="secondary" className="rounded-full">
                            {variation.bodyColors.length} colors
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {variation.bodyColors.map((bodyColor) => (
                            <Badge
                              key={`${variation.name}-${bodyColor}`}
                              variant="outline"
                              className="rounded-full"
                            >
                              <BodyColorChip
                                bodyColor={bodyColor}
                                swatchClassName="size-2.5"
                                textClassName="text-xs"
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
        {filteredUnits.length > 0 && (
          <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * unitsPerPage + 1}-
              {Math.min(currentPage * unitsPerPage, filteredUnits.length)} of {filteredUnits.length}{' '}
              units
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        </CardContent>
      </Card>

      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open)
          if (!open) {
            setEditorState(emptyEditorState)
            setColorInputs({})
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden p-0"
        >
          <DialogHeader className="shrink-0 border-b px-6 pb-4 pt-6">
            <DialogTitle>
              {editorState.originalUnitName ? 'Edit Unit Setup' : 'Add Unit Setup'}
            </DialogTitle>
            <DialogDescription>
              Keep this simple: add the unit, list its variations, then assign the valid body colors.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 space-y-6 overflow-y-auto px-6 py-5">
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              Changes here update the Unit Name, Variation, and Body Color dropdowns used in stock
              entry.
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit-name">Unit Name</Label>
              <Input
                id="unit-name"
                value={editorState.unitName}
                onChange={(event) =>
                  setEditorState((current) => ({
                    ...current,
                    unitName: event.target.value,
                  }))
                }
                placeholder="Isuzu D-Max"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Variations</p>
                  <p className="text-sm text-muted-foreground">
                    Add only the valid combinations your team should be allowed to select.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={handleAddVariation}>
                  <Plus className="mr-2 size-4" />
                  Add Variation
                </Button>
              </div>

              <div className="space-y-4">
                {editorState.variations.map((variation, variationIndex) => (
                  <Card key={`variation-${variationIndex}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">
                            Variation {variationIndex + 1}
                          </CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Keep the variation name unique under this unit to avoid duplicate stock
                            combinations.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => confirmDeleteVariation(variationIndex)}
                          disabled={editorState.variations.length === 1}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2 xl:col-span-2">
                          <Label>Variation Name</Label>
                          <Input
                            value={variation.name}
                            onChange={(event) =>
                              handleVariationFieldChange(
                                variationIndex,
                                'name',
                                event.target.value
                              )
                            }
                            placeholder="4x2 LS-A AT"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Transmission</Label>
                          <Input
                            value={variation.transmission ?? ''}
                            onChange={(event) =>
                              handleVariationFieldChange(
                                variationIndex,
                                'transmission',
                                event.target.value
                              )
                            }
                            placeholder="AT"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Drivetrain</Label>
                          <Input
                            value={variation.drivetrain ?? ''}
                            onChange={(event) =>
                              handleVariationFieldChange(
                                variationIndex,
                                'drivetrain',
                                event.target.value
                              )
                            }
                            placeholder="4x2"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="space-y-2">
                          <Label>Body Type</Label>
                          <Input
                            value={variation.bodyType ?? ''}
                            onChange={(event) =>
                              handleVariationFieldChange(
                                variationIndex,
                                'bodyType',
                                event.target.value
                              )
                            }
                            placeholder="Pickup"
                          />
                        </div>
                        <div className="flex items-end">
                          <Badge variant="secondary" className="rounded-full">
                            {variation.bodyColors.length} saved colors
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-dashed bg-muted/20 p-4">
                        <div>
                          <Label>Add Body Colors</Label>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Add one or many colors separated by commas. Common names like Red,
                            Blue, White, Silver, and Black will now preview with the proper swatch.
                          </p>
                        </div>
                        <div className="flex flex-col gap-3 md:flex-row">
                          <Input
                            value={colorInputs[variationIndex] ?? ''}
                            onChange={(event) =>
                              setColorInputs((current) => ({
                                ...current,
                                [variationIndex]: event.target.value,
                              }))
                            }
                            placeholder="Splash White, Mercury Silver"
                          />
                          <Button type="button" onClick={() => handleAddColors(variationIndex)}>
                            <CirclePlus className="mr-2 size-4" />
                            Add Color
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {variation.bodyColors.map((bodyColor) => (
                            <Badge
                              key={`${variation.name || 'variation'}-${bodyColor}`}
                              variant="outline"
                              className="rounded-full pr-2"
                            >
                              <BodyColorChip
                                bodyColor={bodyColor}
                                swatchClassName="size-2.5"
                                textClassName="text-xs"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleVariationFieldChange(
                                    variationIndex,
                                    'bodyColors',
                                    variation.bodyColors.filter((color) => color !== bodyColor)
                                  )
                                }
                                className="ml-2 text-muted-foreground transition hover:text-destructive"
                                aria-label={`Remove ${bodyColor}`}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveUnit}>
              <Settings2 className="mr-2 size-4" />
              Save Unit Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={pendingDelete?.title ?? 'Confirm delete'}
        description={pendingDelete?.description ?? 'Are you sure you want to continue?'}
        confirmLabel="Delete"
        onConfirm={() => {
          pendingDelete?.onConfirm()
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
