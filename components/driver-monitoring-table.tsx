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

const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded'
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
      <p className="text-sm text-muted-foreground">All deliveries matching your filters, including disconnected drivers. Open details for GPS and delay history.</p>
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader><DialogTitle>{selected?.name} · Delivery details</DialogTitle><DialogDescription>GPS health, delivery reference and recorded delay history.</DialogDescription></DialogHeader>
        {selected && <div className="space-y-5">
          {selected.urgent && <p role="alert" className="rounded-lg border-2 border-red-600 bg-red-500/10 p-3 font-semibold text-red-600 dark:text-red-400">URGENT: {selected.trackingIssue}. Contact the driver. GPS loss alone does not confirm that the phone is offline.</p>}
          <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Unit / delivery</dt><dd>{selected.vehicle} · {selected.stockNumber}</dd><dd>{selected.origin} → {selected.destination}</dd></div>
            <div><dt className="text-muted-foreground">Status / GPS</dt><dd>{selected.status} · {selected.gpsLabel}</dd><dd>{selected.trackingGap}</dd></div>
            <div><dt className="text-muted-foreground">Last GPS fix</dt><dd>{date(selected.currentLocationUpdatedAt)}</dd><dd>{selected.coordinates ? `${selected.coordinates.lat.toFixed(5)}, ${selected.coordinates.lng.toFixed(5)}` : 'Position unavailable'}</dd></div>
            <div><dt className="text-muted-foreground">Scheduled / started / completed</dt><dd>{date(selected.scheduledShipmentAt)}</dd><dd>{date(selected.actualStartTime)}</dd><dd>{date(selected.completedAt)}</dd></div>
            <div><dt className="text-muted-foreground">ETA reliability</dt><dd>{selected.etaReliability} · {selected.eta}</dd><dd>{selected.lastKnownEta}</dd></div>
            <div><dt className="text-muted-foreground">Delay comparison</dt><dd>{selected.delay.label}</dd><dd>{selected.delay.reason}</dd><dd>Expected: {date(selected.delay.plannedArrivalAt)}</dd></div>
          </dl>
          <DeliveryDelayHistory driverId={driverId} />
        </div>}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(idleHistory)} onOpenChange={(open) => { if (!open) setIdleHistory(null) }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl"><DialogHeader>
        <DialogTitle>{idleHistory?.firstName} {idleHistory?.lastName} · Delay history</DialogTitle>
        <DialogDescription>No active delivery is assigned to this driver.</DialogDescription>
      </DialogHeader>{idleHistory && <DeliveryDelayHistory driverId={idleHistory.id} />}</DialogContent>
    </Dialog>
  </>
}
