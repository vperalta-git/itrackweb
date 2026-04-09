'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type AssignedAgentDisplayProps = {
  agentName: string
  avatarUrl?: string
  secondaryText?: string
  avatarClassName?: string
}

export function AssignedAgentDisplay({
  agentName,
  avatarUrl = '',
  secondaryText,
  avatarClassName = 'size-8',
}: AssignedAgentDisplayProps) {
  const initials = agentName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="flex items-center gap-3">
      <Avatar className={avatarClassName}>
        <AvatarImage src={avatarUrl} alt={agentName} />
        <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
          {initials || 'NA'}
        </AvatarFallback>
      </Avatar>
      <div>
        <span className="font-medium">{agentName}</span>
        {secondaryText ? <p className="text-xs text-muted-foreground">{secondaryText}</p> : null}
      </div>
    </div>
  )
}
