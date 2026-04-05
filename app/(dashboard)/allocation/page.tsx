import { redirect } from 'next/navigation'
import { getDefaultRolePath } from '@/lib/rbac'

// Redirect to units allocation as the default
export default function AllocationPage() {
  redirect(getDefaultRolePath('allocation/units'))
}
