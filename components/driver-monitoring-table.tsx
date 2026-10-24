'use client'
import * as React from 'react'
import type { SystemUser } from '@/lib/user-data'
import type { TrackingDriver } from '@/app/(dashboard)/allocation/drivers/tracking/page'
import { DataTable } from '@/components/data-table'
import { DeliveryDelayHistory } from '@/components/delivery-delay-history'
import { StatusBadge } from '@/components/status-badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RouteMapFrame } from '@/components/route-map-frame'
import { Clock3, MapPin, Navigation, Truck, TriangleAlert } from 'lucide-react'

const date = (value: string | null) => value && Number.isFinite(new Date(value).getTime())
  ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded'
export function DriverMonitoringTable({ drivers, idleDrivers = [], selected, onSelect, open, onOpenChange, driverId }: {
  drivers: TrackingDriver[]; selected: TrackingDriver | null; onSelect: (driver: TrackingDriver) => void;
  open: boolean; onOpenChange: (open: boolean) => void; driverId?: string | null; idleDrivers?: SystemUser[]
}) {
  type DriverRow = { id: string; name: string; phone: string; delivery?: TrackingDriver; user?: SystemUser }
  const [idleHistory, setIdleHistory] = React.useState<SystemUser | null>(null)
  const rows: DriverRow[] = [
    ...[...drivers].sort((a, b) => Number(b.urgent) - Number(a.urgent)).map((delivery) => ({ id: delivery.id, name: delivery.name, phone: delivery.phone, delivery })),
    ...idleDrivers.map((user) => ({ id: user.id, name: `${user.firstName} ${user.lastName}`.trim(), phone: user.phone, user })),
  ]
  return <>
    <Card><CardHeader><CardTitle>Driver monitoring</CardTitle>
      <p className="text-sm text-muted-foreground">All deliveries matching your filters, including disconnected drivers. Open details for the live map, GPS and delay history.</p>
    </CardHeader><CardContent>
      <DataTable<DriverRow, unknown> data={rows}
        tableClassName="min-w-[1100px]" getRowClassName={(driver) => driver.delivery?.urgent ? 'border-l-4 border-red-600 bg-red-500/10' : ''}
        columns={[
          { accessorKey: 'name', header: 'Driver', cell: ({ row }) => <div className="font-medium">{row.original.name}<p className="text-xs text-muted-foreground">{row.original.phone}</p></div> },
          { id: 'vehicle', header: 'Unit', cell: ({ row }) => <div>{row.original.delivery?.vehicle ?? 'No active delivery'}<p className="text-xs text-muted-foreground">{row.original.delivery?.stockNumber}</p></div> },
          { id: 'status', header: 'Delivery status', cell: ({ row }) => row.original.delivery ? <StatusBadge status={row.original.delivery.status} /> : 'No active delivery' },
          { id: 'gpsLabel', header: 'GPS / connectivity', cell: ({ row }) => { const delivery = row.original.delivery; return delivery ? <div><Badge className={delivery.urgent ? 'bg-red-600 text-white' : delivery.gpsColor}>{delivery.urgent ? 'URGENT: GPS unavailable' : delivery.gpsLabel}</Badge><p className="mt-1 text-xs">Last GPS: {delivery.lastGpsAge}</p></div> : 'Not tracking an active trip' } },
          { id: 'destination', header: 'Destination', cell: ({ row }) => row.original.delivery?.destination ?? '—' },
          { id: 'eta', header: 'ETA / delay', cell: ({ row }) => <div>{row.original.delivery?.eta ?? '—'}<p className="text-xs text-muted-foreground">{row.original.delivery?.delay.label}</p></div> },
          { id: 'actions', header: 'Details', cell: ({ row }) => <Button size="sm" variant="outline" onClick={() => { if (row.original.delivery) { onSelect(row.original.delivery); onOpenChange(true) } else if (row.original.user) setIdleHistory(row.original.user) }}>Details & history</Button> },
        ]} />
    </CardContent></Card>
    <Dialog open={open && Boolean(selected)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[min(1200px,calc(100vw-3rem))]">
        <DialogHeader className="shrink-0 border-b px-5 py-5 pr-12 text-left sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40"><Truck className="size-5 text-muted-foreground" /></div>
            <div className="min-w-0">
              <p className="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">Delivery details</p>
              <DialogTitle className="break-words text-xl leading-tight">{selected?.name}</DialogTitle>
            </div>
            {selected && <div className="ml-auto hidden shrink-0 sm:block"><StatusBadge status={selected.status} /></div>}
          </div>
          <DialogDescription className="mt-1">Live location, delivery progress and recorded delay history.</DialogDescription>
        </DialogHeader>
        {selected && <div className="min-h-0 min-w-0 space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain p-4 sm:space-y-6 sm:p-6">
          {selected.urgent && <div role="alert" className="flex min-w-0 items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-red-700 dark:text-red-300">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 text-sm leading-relaxed">
              <p className="font-semibold">Urgent · {selected.trackingIssue}</p>
              <p className="mt-0.5 text-xs">Contact the driver. GPS loss alone does not confirm that the phone is offline.</p>
            </div>
          </div>}

          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <section aria-label="Delivery map" className="min-w-0 overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Navigation className="size-4 text-muted-foreground" />Live map</h3>
                <Badge className={selected.gpsColor}>{selected.gpsLabel}</Badge>
              </div>
              <div className="relative h-[260px] bg-muted/20 sm:h-[320px] lg:h-[360px]">
                <RouteMapFrame
                  key={selected.id}
                  title={`Delivery map for ${selected.name}`}
                  origin={selected.originCoordinates}
                  destination={selected.destinationCoordinates}
                  focus={selected.coordinates}
                  focusState={selected.gpsState === 'live' ? 'live' : 'warning'}
                  focusLabel={`${selected.gpsState === 'live' ? 'Live' : 'Last known'} GPS position · ${date(selected.currentLocationUpdatedAt)}`}
                  resolvedRoute={selected.routeEstimate?.coordinates ?? null}
                />
              </div>
              <div className="space-y-3 border-t px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-orange-500" />Pickup</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-green-600" />Destination</span>
                  {selected.coordinates && <span className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${selected.gpsState === 'live' ? 'bg-blue-600' : 'bg-red-600'}`} />{selected.gpsState === 'live' ? 'Live driver' : 'Last known position'}</span>}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{!selected.coordinates
                  ? 'Driver position unavailable. Only recorded route locations are shown.'
                  : selected.gpsState === 'live'
                    ? 'Driver location updates automatically while this dialog is open.'
                    : `Last known position · ${selected.lastGpsAge}. This is not a live GPS fix.`}</p>
                <div className="grid min-w-0 gap-3 border-t pt-3 text-sm sm:grid-cols-2">
                  <div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">From</p><p className="break-words font-medium">{selected.origin || 'Not recorded'}</p></div>
                  <div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">To</p><p className="break-words font-medium">{selected.destination || 'Not recorded'}</p></div>
                </div>
              </div>
            </section>

            <section aria-label="Delivery overview" className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Delivery overview</h3><span className="sm:hidden"><StatusBadge status={selected.status} /></span></div>
              <p className="break-words text-sm font-medium leading-relaxed">{selected.vehicle}</p>
              <p className="mt-1 break-words font-mono text-xs text-muted-foreground">{selected.stockNumber || 'Unit reference not recorded'}</p>
              <div className="my-5 space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{selected.gpsState === 'live' ? 'Journey progress' : 'Last known progress'}</span><span className="font-medium tabular-nums">{selected.progress === null ? 'Unavailable' : `${selected.progress}%`}</span></div>
                {selected.progress !== null && <Progress value={selected.progress} aria-label={selected.gpsState === 'live' ? 'Journey progress' : 'Last known journey progress'} className="h-1.5" />}
              </div>
              <dl className="space-y-4 border-t pt-4 text-sm">
                <div className="min-w-0"><dt className="mb-1 text-xs text-muted-foreground">Travel time</dt><dd className="break-words leading-relaxed">{selected.eta}</dd>{selected.lastKnownEta && <dd className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">Last known: {selected.lastKnownEta}</dd>}</div>
                <div className="grid min-w-0 grid-cols-2 gap-3">
                  <div className="min-w-0"><dt className="mb-1 text-xs text-muted-foreground">Distance remaining</dt><dd className="break-words">{selected.distanceLeft}</dd></div>
                  <div className="min-w-0"><dt className="mb-1 text-xs text-muted-foreground">Live arrival estimate</dt><dd className="break-words">{selected.expectedArrival ?? 'Unavailable'}</dd></div>
                </div>
                <div className="min-w-0 border-t pt-4"><dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" />Last GPS fix</dt><dd>{date(selected.currentLocationUpdatedAt)}</dd><dd className="mt-1 text-xs text-muted-foreground">{selected.trackingGap}</dd>{selected.coordinates && <dd className="mt-2 break-words font-mono text-xs text-muted-foreground">{selected.coordinates.lat.toFixed(5)}, {selected.coordinates.lng.toFixed(5)}</dd>}</div>
              </dl>
            </section>
          </div>

          <section aria-label="Delivery timing" className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-muted-foreground" />Delivery timing</h3><Badge variant="outline" className="max-w-full whitespace-normal">{selected.delay.label}</Badge></div>
            <dl className="grid min-w-0 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Scheduled departure', selected.scheduledShipmentAt], ['Actual departure', selected.actualStartTime],
                ['Completed', selected.completedAt], ['Planned arrival reference', selected.delay.plannedArrivalAt],
              ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="mb-1 text-xs text-muted-foreground">{label}</dt><dd className="break-words">{date(value)}</dd></div>)}
            </dl>
            {selected.delay.reason && <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">{selected.delay.reason}</p>}
          </section>
          <DeliveryDelayHistory key={driverId ?? selected.id} driverId={driverId} />
        </div>}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(idleHistory)} onOpenChange={(open) => { if (!open) setIdleHistory(null) }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-5xl"><DialogHeader className="shrink-0 border-b p-5 pr-12 text-left sm:p-6">
        <DialogTitle>{idleHistory?.firstName} {idleHistory?.lastName} · Delay history</DialogTitle>
        <DialogDescription>No active delivery is assigned to this driver.</DialogDescription>
      </DialogHeader><div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-4 sm:p-6">{idleHistory && <DeliveryDelayHistory key={idleHistory.id} driverId={idleHistory.id} />}</div></DialogContent>
    </Dialog>
  </>
}
