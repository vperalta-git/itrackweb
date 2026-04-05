import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type StatusType =
  | 'available'
  | 'in-stockyard'
  | 'in-transit'
  | 'in-dispatch'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'released'
  | 'in-progress'
  | 'active'
  | 'inactive'
  | 'cancelled'
  | 'no-show'
  | 'scheduled'
  | 'on-route'
  | 'delivered'

interface StatusBadgeProps {
  status: StatusType | string
  className?: string
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  available: {
    label: 'Available',
    className: 'bg-success/10 text-success border-success/20',
  },
  'in-stockyard': {
    label: 'In Stockyard',
    className: 'bg-muted text-muted-foreground border-border',
  },
  'in-transit': {
    label: 'In Transit',
    className: 'bg-info/10 text-info border-info/20',
  },
  'in-dispatch': {
    label: 'In Dispatch',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  approved: {
    label: 'Approved',
    className: 'bg-success/10 text-success border-success/20',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  completed: {
    label: 'Completed',
    className: 'bg-success/10 text-success border-success/20',
  },
  released: {
    label: 'Released',
    className: 'bg-success/10 text-success border-success/20',
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-info/10 text-info border-info/20',
  },
  active: {
    label: 'Active',
    className: 'bg-success/10 text-success border-success/20',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-muted text-muted-foreground border-border',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  'no-show': {
    label: 'No Show',
    className: 'bg-muted text-muted-foreground border-border',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-info/10 text-info border-info/20',
  },
  'on-route': {
    label: 'On Route',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-success/10 text-success border-success/20',
  },
}

// Default fallback for unknown statuses
const defaultConfig = {
  label: 'Unknown',
  className: 'bg-muted text-muted-foreground border-border',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Handle undefined/null/empty status
  if (!status || typeof status !== 'string') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'font-medium text-xs',
          defaultConfig.className,
          className
        )}
      >
        Unknown
      </Badge>
    )
  }

  // Safely lookup config with explicit fallback
  const normalizedStatus = status.toLowerCase().trim()
  const config = Object.prototype.hasOwnProperty.call(statusConfig, normalizedStatus)
    ? statusConfig[normalizedStatus as StatusType]
    : defaultConfig
  
  // Format label from status if using default config
  const label = config === defaultConfig
    ? status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : config.label

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium text-xs',
        config.className,
        className
      )}
    >
      {label}
    </Badge>
  )
}
