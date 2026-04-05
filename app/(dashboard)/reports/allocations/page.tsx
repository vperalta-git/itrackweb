'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReportsAllocationsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/reports/vehicles')
  }, [router])

  return null
}
