'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type SearchableOption = {
  value: string
  label?: string
  keywords?: string[]
}

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SearchableOption[]
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  contentClassName?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyText = 'No matching option found.',
  disabled = false,
  className,
  contentClassName,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'text-foreground w-full justify-between rounded-xl border-border/70 bg-background px-3 font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="min-w-0 flex-1 text-left leading-snug">
            {selectedOption?.label ?? selectedOption?.value ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'min-w-[var(--radix-popover-trigger-width)] max-w-[min(92vw,40rem)] p-0',
          contentClassName
        )}
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={[option.label ?? option.value, option.value, ...(option.keywords ?? [])].join(
                  ' '
                )}
                onSelect={() => {
                  onValueChange(option.value)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mt-0.5 size-4 shrink-0 text-primary',
                    value === option.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="text-foreground whitespace-normal break-words leading-snug">
                  {option.label ?? option.value}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
