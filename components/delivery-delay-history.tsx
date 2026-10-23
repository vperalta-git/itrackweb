'use client'
import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { apiRequest } from '@/lib/api-client'
import { DataTable } from '@/components/data-table'

type DelayEvent = { id: string; driver: string; unit: string; conductionNumber: string; origin: string; destination: string;
  scheduledShipmentAt?: string; expectedArrivalAt: string; actualReferenceAt: string; detectedAt?: string;
  minutesDelayed: number; status: string; source: string }
const date = (value?: string) => value ? new Date(value).toLocaleString() : 'Not recorded'
const columns: ColumnDef<DelayEvent>[] = [
  { accessorKey: 'detectedAt', header: 'Event date / time', cell: ({ row }) => date(row.original.detectedAt) },
  { accessorKey: 'unit', header: 'Unit / delivery', cell: ({ row }) => <div>{row.original.unit}<p className="text-xs text-muted-foreground">{row.original.conductionNumber} · {row.original.origin} → {row.original.destination}</p></div> },
  { accessorKey: 'expectedArrivalAt', header: 'Expected ETA', cell: ({ row }) => date(row.original.expectedArrivalAt) },
  { accessorKey: 'actualReferenceAt', header: 'Actual reference', cell: ({ row }) => date(row.original.actualReferenceAt) },
  { accessorKey: 'minutesDelayed', header: 'Minutes late' },
  { accessorKey: 'status', header: 'Status / source', cell: ({ row }) => <div>{row.original.status}<p className="text-xs text-muted-foreground">{row.original.source}</p></div> },
]
export function DeliveryDelayHistory({ driverId }: { driverId?: string | null }) {
  const [events, setEvents] = React.useState<DelayEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  React.useEffect(() => {
    let active = true
    setLoading(true); setError('')
    if (!driverId) {
      setEvents([]); setLoading(false); setError('Driver identity was not recorded or the account was removed. History cannot be grouped for this driver.')
      return
    }
    void apiRequest<DelayEvent[]>('/driver-allocations/delay-history', { query: { driverId } }).then((data) => {
      if (active) setEvents(data)
    }).catch(() => { if (active) setError('Delay history could not be loaded. Close and reopen this dialog to retry.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [driverId])
  return <section className="space-y-3">
    <h3 className="font-semibold">Driver delay history · 2-hour ETA allowance</h3>
    <p className="text-sm text-muted-foreground">{!error && `${events.length} delivery record(s) exceeded the allowance. `}Delays are measured from the recorded start plus planned duration. They do not establish the cause of delay.</p>
    {loading ? <p>Loading history…</p> : error ? <p role="alert" className="text-destructive">{error}</p> :
      <DataTable columns={columns} data={events} tableClassName="min-w-[900px]" />}
  </section>
}
