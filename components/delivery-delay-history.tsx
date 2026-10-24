'use client'
import * as React from 'react'
import { apiRequest } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronLeft, ChevronRight, History } from 'lucide-react'

type DelayEvent = { id: string; driver: string; unit: string; conductionNumber: string; origin: string; destination: string;
  scheduledShipmentAt?: string; expectedArrivalAt: string; actualReferenceAt: string; detectedAt?: string;
  minutesDelayed: number; status: string; source: string }
const date = (value?: string) => value && Number.isFinite(new Date(value).getTime())
  ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded'
const label = (value: string) => value.replaceAll('_', ' ').replaceAll('-', ' ')
const PAGE_SIZE = 5

function EventTiming({ event }: { event: DelayEvent }) {
  return <dl className="space-y-2 text-xs leading-relaxed">
    <div><dt className="text-muted-foreground">Planned arrival</dt><dd>{date(event.expectedArrivalAt)}</dd></div>
    <div><dt className="text-muted-foreground">Actual reference</dt><dd>{date(event.actualReferenceAt)}</dd></div>
  </dl>
}

function EventDelay({ event }: { event: DelayEvent }) {
  return <div className="space-y-1.5">
    <p className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">{event.minutesDelayed.toLocaleString()} <span className="text-xs font-normal">min late</span></p>
    <p className="text-xs capitalize">{label(event.status)}</p>
    <p className="text-xs leading-relaxed text-muted-foreground">{label(event.source)}</p>
  </div>
}
export function DeliveryDelayHistory({ driverId }: { driverId?: string | null }) {
  const [events, setEvents] = React.useState<DelayEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [page, setPage] = React.useState(1)
  React.useEffect(() => {
    let active = true
    setLoading(true); setError(''); setEvents([]); setPage(1)
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
  const pageCount = Math.max(1, Math.ceil(events.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleEvents = events.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  return <section aria-label="Driver delay history" className="min-w-0 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-muted-foreground" />Driver delay history</h3>
      <Badge variant="outline" className="font-normal">2-hour ETA allowance</Badge>
    </div>
    <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">Delays use the recorded departure plus planned duration. These records do not establish the cause of a delay.</p>
    {loading ? <p role="status" className="rounded-lg bg-muted/30 p-6 text-center text-sm text-muted-foreground">Loading history…</p>
      : error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
      : events.length === 0 ? <div className="rounded-lg border border-dashed bg-muted/10 px-4 py-8 text-center"><p className="text-sm font-medium">No delays beyond the allowance</p><p className="mt-1 text-xs text-muted-foreground">No recorded delivery exceeded the 2-hour ETA allowance for this driver.</p></div>
      : <>
        <div className="hidden min-w-0 overflow-hidden rounded-lg border sm:block">
          <Table className="min-w-[620px] table-fixed">
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[18%] px-3 text-xs">Recorded</TableHead>
              <TableHead className="w-[32%] px-3 text-xs">Unit / delivery</TableHead>
              <TableHead className="w-[29%] px-3 text-xs">Arrival reference</TableHead>
              <TableHead className="w-[21%] px-3 text-xs">Delay / status</TableHead>
            </TableRow></TableHeader>
            <TableBody>{visibleEvents.map((event) => <TableRow key={event.id}>
              <TableCell className="px-3 py-4 align-top text-xs leading-relaxed whitespace-normal">{date(event.detectedAt)}</TableCell>
              <TableCell className="px-3 py-4 align-top whitespace-normal"><p className="break-words text-sm font-medium leading-relaxed">{event.unit}</p><p className="mt-1 break-words font-mono text-xs text-muted-foreground">{event.conductionNumber}</p><p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">{event.origin} → {event.destination}</p></TableCell>
              <TableCell className="px-3 py-4 align-top whitespace-normal"><EventTiming event={event} /></TableCell>
              <TableCell className="px-3 py-4 align-top break-words whitespace-normal"><EventDelay event={event} /></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </div>
        <div className="space-y-3 sm:hidden">{visibleEvents.map((event) => <article key={event.id} className="min-w-0 space-y-3 rounded-lg border p-3.5">
          <div><p className="break-words text-sm font-medium leading-relaxed">{event.unit}</p><p className="mt-1 break-words font-mono text-xs text-muted-foreground">{event.conductionNumber}</p><p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">{event.origin} → {event.destination}</p></div>
          <p className="border-t pt-3 text-xs text-muted-foreground">Recorded {date(event.detectedAt)}</p>
          <div className="grid min-w-0 grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3"><EventTiming event={event} /><EventDelay event={event} /></div>
        </article>)}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, events.length)} of {events.length} recorded {events.length === 1 ? 'delay' : 'delays'}</p>
          <div className="flex items-center gap-2"><span>Page {currentPage} of {pageCount}</span><Button type="button" variant="outline" size="icon" className="size-8" aria-label="Previous history page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="size-4" /></Button><Button type="button" variant="outline" size="icon" className="size-8" aria-label="Next history page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight className="size-4" /></Button></div>
        </div>
      </>}
  </section>
}
