'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import Cropper, { type Area } from 'react-easy-crop'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiRequest } from '@/lib/api-client'
import {
  isValidMobilePhoneNumber,
  MOBILE_PHONE_VALIDATION_MESSAGE,
} from '@/lib/phone'
import { toast } from 'sonner'
import { getRoleFromPathname, type Role } from '@/lib/rbac'
import { getRoleLabel, getSessionUser, updateSessionUser } from '@/lib/session'
import { loadUsers, syncUsersFromBackend, type SystemUser, updateUserRecord } from '@/lib/user-data'

type ProfileUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  avatar: string
  bio: string
}

const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters and include one uppercase letter, one number, and one special character.'

const isValidStrongPassword = (value: string) =>
  /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value)

const AVATAR_OUTPUT_SIZE = 320

const createImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load image'))
    image.src = src
  })

const getCroppedAvatarDataUrl = async (imageSrc: string, crop: Area) => {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to prepare the cropped image.')
  }

  canvas.width = AVATAR_OUTPUT_SIZE
  canvas.height = AVATAR_OUTPUT_SIZE

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE
  )

  return canvas.toDataURL('image/jpeg', 0.92)
}

const toProfileUser = (role: Role, user: ReturnType<typeof getSessionUser>): ProfileUser => ({
  id: user?.id ?? '',
  firstName: user?.firstName ?? '',
  lastName: user?.lastName ?? '',
  email: user?.email ?? '',
  phone: user?.phone ?? '',
  role: user ? getRoleLabel(user.role) : role,
  avatar: user?.avatarUrl ?? '',
  bio: user?.bio ?? '',
})

export default function ProfilePage() {
  const pathname = usePathname()
  const role = getRoleFromPathname(pathname)
  const sessionUser = getSessionUser()
  const [isSaving, setIsSaving] = React.useState(false)
  const [isOtherProfilesOpen, setIsOtherProfilesOpen] = React.useState(false)
  const [user, setUser] = React.useState<ProfileUser>(() => toProfileUser(role, sessionUser))
  const [otherProfiles, setOtherProfiles] = React.useState<SystemUser[]>(loadUsers())
  const [selectedOtherProfile, setSelectedOtherProfile] = React.useState<SystemUser | null>(null)
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isAvatarCropOpen, setIsAvatarCropOpen] = React.useState(false)
  const [avatarDraft, setAvatarDraft] = React.useState('')
  const [avatarCrop, setAvatarCrop] = React.useState({ x: 0, y: 0 })
  const [avatarZoom, setAvatarZoom] = React.useState(1)
  const [avatarCroppedAreaPixels, setAvatarCroppedAreaPixels] = React.useState<Area | null>(null)
  const [avatarPreview, setAvatarPreview] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    setUser(toProfileUser(role, getSessionUser()))
  }, [role, pathname])

  React.useEffect(() => {
    void syncUsersFromBackend()
      .then((users) => {
        setOtherProfiles(users)
      })
      .catch(() => {
        return null
      })
  }, [])

  React.useEffect(() => {
    const availableProfiles = otherProfiles.filter((profile) => profile.email !== user.email)
    setSelectedOtherProfile(availableProfiles[0] ?? null)
  }, [otherProfiles, user.email])

  const handleSave = async () => {
    if (!sessionUser) return
    if (!isValidMobilePhoneNumber(user.phone)) {
      toast.error(MOBILE_PHONE_VALIDATION_MESSAGE)
      return
    }

    setIsSaving(true)
    try {
      const updatedUser = await updateUserRecord(sessionUser.id, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: sessionUser.role,
        status: 'active',
        bio: user.bio,
        avatarUrl: user.avatar || null,
      })

      updateSessionUser({
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        bio: updatedUser.bio ?? '',
        avatarUrl: updatedUser.avatarUrl ?? null,
      })
      setUser((current) => ({
        ...current,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        bio: updatedUser.bio ?? '',
        avatar: updatedUser.avatarUrl ?? '',
      }))
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setUser((prev) => ({ ...prev, [field]: value }))
  }

  const handlePasswordChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file for the profile picture.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result) {
        toast.error('Unable to read the selected image.')
        return
      }

      setAvatarDraft(result)
      setAvatarCrop({ x: 0, y: 0 })
      setAvatarZoom(1)
      setAvatarCroppedAreaPixels(null)
      setAvatarPreview('')
      setIsAvatarCropOpen(true)
    }
    reader.onerror = () => {
      toast.error('Unable to read the selected image.')
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleApplyAvatarCrop = async () => {
    if (!avatarDraft || !avatarCroppedAreaPixels) return

    try {
      const croppedAvatar = avatarPreview || (await getCroppedAvatarDataUrl(avatarDraft, avatarCroppedAreaPixels))
      setUser((prev) => ({ ...prev, avatar: croppedAvatar }))
      setIsAvatarCropOpen(false)
      toast.success('Profile picture cropped. Save changes to apply it.')
    } catch {
      toast.error('Unable to crop the selected image.')
    }
  }

  React.useEffect(() => {
    let isActive = true

    const updatePreview = async () => {
      if (!avatarDraft || !avatarCroppedAreaPixels) {
        setAvatarPreview('')
        return
      }

      try {
        const nextPreview = await getCroppedAvatarDataUrl(avatarDraft, avatarCroppedAreaPixels)
        if (isActive) {
          setAvatarPreview(nextPreview)
        }
      } catch {
        if (isActive) {
          setAvatarPreview('')
        }
      }
    }

    void updatePreview()

    return () => {
      isActive = false
    }
  }, [avatarCroppedAreaPixels, avatarDraft])

  const handlePasswordSave = async () => {
    if (!sessionUser) return

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please complete all password fields')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }

    if (!isValidStrongPassword(passwordForm.newPassword)) {
      toast.error(PASSWORD_REQUIREMENTS_MESSAGE)
      return
    }

    await apiRequest('/auth/change-password', {
      method: 'POST',
      body: {
        userId: sessionUser.id,
        currentPassword: passwordForm.currentPassword,
        nextPassword: passwordForm.newPassword,
      },
    })

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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelection}
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 size-7 rounded-full shadow"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
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
              <p className="text-xs text-muted-foreground">
                Use the camera button on your profile card to choose a profile picture.
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
                <p className="text-xs text-muted-foreground">
                  {PASSWORD_REQUIREMENTS_MESSAGE}
                </p>
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
        <DialogContent className="w-[900px] max-w-[90vw] sm:!max-w-[900px]">
          <DialogHeader>
            <DialogTitle>View Other Profile</DialogTitle>
            <DialogDescription>
              Browse other user profiles in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid h-[560px] gap-6 lg:grid-cols-[260px_1fr]">
            <div className="overflow-hidden rounded-2xl border bg-muted/15">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-semibold">Users</p>
                <p className="text-xs text-muted-foreground">
                  Select a profile to view details.
                </p>
              </div>
              <div className="h-[calc(560px-73px)] overflow-y-auto p-3">
                <div className="space-y-2">
                  {otherProfiles
                    .filter((profile) => profile.email !== user.email)
                    .map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => setSelectedOtherProfile(profile)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          selectedOtherProfile?.id === profile.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-background hover:bg-muted/40'
                        }`}
                      >
                    <Avatar className="size-10">
                      <AvatarImage src={profile.avatarUrl ?? ''} alt={`${profile.firstName} ${profile.lastName}`} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {profile.firstName[0]}{profile.lastName[0]}
                      </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {profile.firstName} {profile.lastName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{profile.role}</p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {selectedOtherProfile && (
            <div className="overflow-y-auto rounded-2xl border bg-muted/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="size-20 border">
                  <AvatarImage
                    src={selectedOtherProfile.avatarUrl ?? ''}
                    alt={`${selectedOtherProfile.firstName} ${selectedOtherProfile.lastName}`}
                  />
                  <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                    {selectedOtherProfile.firstName[0]}{selectedOtherProfile.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedOtherProfile.firstName} {selectedOtherProfile.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedOtherProfile.role === 'sales-agent'
                      ? 'Sales Agent'
                      : selectedOtherProfile.role === 'dispatch'
                      ? 'Dispatch'
                      : selectedOtherProfile.role.charAt(0).toUpperCase() + selectedOtherProfile.role.slice(1)}
                  </p>
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
                  <p className="mt-2 font-medium">
                    {selectedOtherProfile.role === 'sales-agent'
                      ? 'Sales Agent'
                      : selectedOtherProfile.role === 'dispatch'
                      ? 'Dispatch'
                      : selectedOtherProfile.role.charAt(0).toUpperCase() + selectedOtherProfile.role.slice(1)}
                  </p>
                </div>
                <div className="rounded-xl bg-background p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Bio
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/85">
                    {selectedOtherProfile.bio || 'No bio available.'}
                  </p>
                </div>
              </div>
            </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAvatarCropOpen} onOpenChange={setIsAvatarCropOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
            <DialogDescription>
              Adjust the framing before applying the new profile picture.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-2 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3">
              <div className="relative h-[360px] overflow-hidden rounded-2xl border bg-black/80">
                {avatarDraft ? (
                  <Cropper
                    image={avatarDraft}
                    crop={avatarCrop}
                    zoom={avatarZoom}
                    aspect={1}
                    cropShape="rect"
                    showGrid={true}
                    onCropChange={setAvatarCrop}
                    onZoomChange={setAvatarZoom}
                    onCropComplete={(_, croppedAreaPixels) =>
                      setAvatarCroppedAreaPixels(croppedAreaPixels)
                    }
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/70">
                    Select an image to start cropping.
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label>Zoom</Label>
                  <span className="text-muted-foreground">{avatarZoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={avatarZoom}
                  onChange={(event) => setAvatarZoom(Number(event.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/20 p-5">
                <p className="text-sm font-medium">Cropped Preview</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This is how the profile picture will look after applying the crop.
                </p>
                <div className="mt-5 flex justify-center">
                  <Avatar className="size-40 border-4 border-background shadow-lg">
                    <AvatarImage src={avatarPreview || user.avatar} alt="Cropped preview" />
                    <AvatarFallback className="bg-primary text-3xl font-bold text-primary-foreground">
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                Drag the image to reposition it and use the zoom slider to frame the part you want to keep.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAvatarCropOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyAvatarCrop}>Apply Crop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
