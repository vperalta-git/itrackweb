'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  Shield,
  Camera,
  KeyRound,
  Save,
} from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getRoleFromPathname, type Role } from '@/lib/rbac'

const mockUsersByRole: Record<
  Role,
  {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    role: string
    avatar: string
    bio: string
  }
> = {
  admin: {
    id: '1',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'admin@isuzupasig.com',
    phone: '+63 917 111 2222',
    role: 'Administrator',
    avatar: '',
    bio: 'Oversees the full I-TRACK platform, user access, inventory visibility, and operational reporting for Isuzu Pasig.',
  },
  supervisor: {
    id: '9',
    firstName: 'Ramon',
    lastName: 'Flores',
    email: 'supervisor@isuzupasig.com',
    phone: '+63 924 888 9999',
    role: 'Supervisor',
    avatar: '',
    bio: 'Supervises inventory operations, dispatch visibility, reporting access, and user oversight with the same platform permissions as admin.',
  },
  manager: {
    id: '2',
    firstName: 'Carlos',
    lastName: 'Garcia',
    email: 'manager@isuzupasig.com',
    phone: '+63 918 222 3333',
    role: 'Manager',
    avatar: '',
    bio: 'Leads the sales team, monitors assigned agents, and tracks vehicle movement, preparation, releases, and test drive activity.',
  },
  'sales-agent': {
    id: '3',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'agent@isuzupasig.com',
    phone: '+63 919 333 4444',
    role: 'Sales Agent',
    avatar: '',
    bio: 'Handles allocated units, customer coordination, test drive requests, and follows active deliveries and released vehicles.',
  },
}

const otherProfiles = [
  {
    id: '10',
    firstName: 'Anna',
    lastName: 'Lim',
    email: 'anna.lim@isuzupasig.com',
    phone: '+63 920 444 5555',
    position: 'Sales Agent',
    bio: 'Handles customer coordination, test drive scheduling, and release support for assigned Isuzu units.',
  },
  {
    id: '11',
    firstName: 'Pedro',
    lastName: 'Reyes',
    email: 'pedro.reyes@isuzupasig.com',
    phone: '+63 922 666 7777',
    position: 'Sales Agent',
    bio: 'Monitors allocated vehicle requests and assists customers through test drive and preparation workflows.',
  },
  {
    id: '12',
    firstName: 'Liza',
    lastName: 'Mendoza',
    email: 'liza.mendoza@isuzupasig.com',
    phone: '+63 923 777 8888',
    position: 'Dispatch Coordinator',
    bio: 'Coordinates preparation completion, dispatch updates, and turnover readiness across active units.',
  },
  {
    id: '13',
    firstName: 'Ramon',
    lastName: 'Flores',
    email: 'supervisor@isuzupasig.com',
    phone: '+63 924 888 9999',
    position: 'Supervisor',
    bio: 'Oversees inventory movement, team activity, and system-wide reporting visibility for Isuzu Pasig.',
  },
]

export default function ProfilePage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isOtherProfilesOpen, setIsOtherProfilesOpen] = React.useState(false)
  const [user, setUser] = React.useState(mockUsersByRole[role])
  const [selectedOtherProfile, setSelectedOtherProfile] = React.useState(otherProfiles[0])
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  React.useEffect(() => {
    setUser(mockUsersByRole[role])
  }, [role])

  React.useEffect(() => {
    const currentEmail = mockUsersByRole[role].email
    const availableProfiles = otherProfiles.filter((profile) => profile.email !== currentEmail)
    setSelectedOtherProfile(availableProfiles[0] ?? otherProfiles[0])
  }, [role])

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success('Profile updated successfully')
    }, 1000)
  }

  const handleInputChange = (field: string, value: string) => {
    setUser((prev) => ({ ...prev, [field]: value }))
  }

  const handlePasswordChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
  }

  const handlePasswordSave = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please complete all password fields')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }

    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    toast.success('Password updated successfully')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your personal information and preferences"
      >
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 size-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </PageHeader>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
            <div className="border-b bg-background p-6 lg:border-r lg:border-b-0">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <Avatar className="size-20 border-4 border-background shadow-lg">
                    <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                    <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 size-7 rounded-full shadow"
                  >
                    <Camera className="size-3.5" />
                    <span className="sr-only">Change avatar</span>
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-semibold leading-tight">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                  <Badge className="mt-3" variant="secondary">
                    <Shield className="mr-1 size-3" />
                    {user.role}
                  </Badge>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="size-4 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-5 w-full"
                onClick={() => setIsOtherProfilesOpen(true)}
              >
                View Other Profile
              </Button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-3">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  First Name
                </p>
                <p className="mt-2 text-base font-semibold">{user.firstName}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Last Name
                </p>
                <p className="mt-2 text-base font-semibold">{user.lastName}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Role
                </p>
                <p className="mt-2 text-base font-semibold">{user.role}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4 md:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Email
                </p>
                <p className="mt-2 text-base font-semibold">{user.email}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Phone
                </p>
                <p className="mt-2 text-base font-semibold">{user.phone}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4 md:col-span-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Bio
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/85">{user.bio}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your personal details and contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={user.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={user.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={user.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={user.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                placeholder="Tell us about yourself..."
              />
              <p className="text-xs text-muted-foreground">
                Brief description for your profile. Max 200 characters.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password from your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
              />
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={handlePasswordSave}>
                Update Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isOtherProfilesOpen} onOpenChange={setIsOtherProfilesOpen}>
        <DialogContent className="w-[94vw] max-w-[900px] sm:!max-w-[900px]">
          <DialogHeader>
            <DialogTitle>View Other Profile</DialogTitle>
            <DialogDescription>
              Browse other user profiles in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="space-y-2">
              {otherProfiles
                .filter((profile) => profile.email !== user.email)
                .map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedOtherProfile(profile)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      selectedOtherProfile.id === profile.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:bg-muted/40'
                    }`}
                  >
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {profile.firstName[0]}{profile.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {profile.firstName} {profile.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{profile.position}</p>
                    </div>
                  </button>
                ))}
            </div>

            <div className="rounded-2xl border bg-muted/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="size-20 border">
                  <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                    {selectedOtherProfile.firstName[0]}{selectedOtherProfile.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedOtherProfile.firstName} {selectedOtherProfile.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedOtherProfile.position}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    First Name
                  </p>
                  <p className="mt-2 font-medium">{selectedOtherProfile.firstName}</p>
                </div>
                <div className="rounded-xl bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Last Name
                  </p>
                  <p className="mt-2 font-medium">{selectedOtherProfile.lastName}</p>
                </div>
                <div className="rounded-xl bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Email
                  </p>
                  <p className="mt-2 font-medium">{selectedOtherProfile.email}</p>
                </div>
                <div className="rounded-xl bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Phone Number
                  </p>
                  <p className="mt-2 font-medium">{selectedOtherProfile.phone}</p>
                </div>
                <div className="rounded-xl bg-background p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Position
                  </p>
                  <p className="mt-2 font-medium">{selectedOtherProfile.position}</p>
                </div>
                <div className="rounded-xl bg-background p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Bio
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/85">
                    {selectedOtherProfile.bio}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
