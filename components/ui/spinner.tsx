import Image from 'next/image'

import { cn } from '@/lib/utils'
import loadingGif from '@/media/loading.gif'

function Spinner({
  className,
  size = 16,
}: {
  className?: string
  size?: number
}) {
  return (
    <Image
      src={loadingGif}
      alt="Loading"
      className={cn('size-4 object-contain', className)}
      unoptimized
      role="status"
      aria-label="Loading"
      width={size}
      height={size}
    />
  )
}

export { Spinner }
