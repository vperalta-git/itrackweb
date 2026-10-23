'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { setReasonRequestListener, type ReasonRequest } from '@/lib/action-reason'

export function ActionReasonDialog() {
  const [request, setRequest] = React.useState<ReasonRequest | null>(null)
  const [reason, setReason] = React.useState('')
  const [confirming, setConfirming] = React.useState(false)
  React.useEffect(() => {
    setReasonRequestListener((next) => { setReason(''); setConfirming(false); setRequest(next) })
    return () => setReasonRequestListener(null)
  }, [])
  const close = (value: string | null) => { request?.resolve(value); setRequest(null) }
  return <Dialog open={Boolean(request)} onOpenChange={(open) => { if (!open) close(null) }}>
    <DialogContent><DialogHeader>
      <DialogTitle>{confirming ? 'Confirm action' : 'Reason required'}</DialogTitle>
      <DialogDescription>{request?.label}</DialogDescription>
    </DialogHeader>
      {confirming ? <p className="whitespace-pre-wrap rounded-lg border p-3">{reason.trim()}</p> : <div className="space-y-2">
        <Label htmlFor="action-reason">Reason (5–1000 characters)</Label>
        <Textarea id="action-reason" autoFocus value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} />
      </div>}
      <DialogFooter><Button variant="outline" onClick={() => close(null)}>Go back</Button>
        <Button variant="destructive" disabled={reason.trim().length < 5} onClick={() => confirming ? close(reason.trim()) : setConfirming(true)}>
          {confirming ? 'Confirm and submit' : 'Review action'}
        </Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
