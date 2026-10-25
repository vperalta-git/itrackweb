'use client'
import { toast } from 'sonner'
import * as React from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'

interface ConfirmActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  requireReason?: boolean
  reasonLabel?: string
  onConfirm: (reason?: string) => void | Promise<void>
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  requireReason = false,
  reasonLabel = 'Reason',
  onConfirm,
}: ConfirmActionDialogProps) {
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (!open) setReason('')
  }, [open])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {requireReason && (
          <div className="space-y-2">
            <label htmlFor="confirm-action-reason" className="text-sm font-medium">
              {reasonLabel}
            </label>
            <Textarea
              id="confirm-action-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Enter a reason for this deletion"
              required
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={async (event) => {
              const submittedReason = reason.trim()
              if (requireReason && !submittedReason) {
                event.preventDefault()
                toast.error('A reason is required.')
                return
              }
              try { await onConfirm(requireReason ? submittedReason : undefined) }
              catch (error) { if (!(error instanceof Error && error.message === 'Action cancelled.')) toast.error(error instanceof Error ? error.message : 'The action could not be completed.') }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
