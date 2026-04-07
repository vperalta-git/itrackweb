'use client'

import * as React from 'react'
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Database,
  Mail,
  Save,
} from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  browserNotificationsSupported,
  getBrowserNotificationPermission,
  loadWebNotificationPreferences,
  saveWebNotificationPreferences,
} from '@/lib/notification-preferences'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [isSaving, setIsSaving] = React.useState(false)
  const [notificationPreferences, setNotificationPreferences] = React.useState(
    loadWebNotificationPreferences
  )
  const [browserNotificationPermission, setBrowserNotificationPermission] = React.useState(
    getBrowserNotificationPermission
  )

  const handleSave = async () => {
    setIsSaving(true)

    try {
      let nextNotificationPreferences = notificationPreferences

      if (nextNotificationPreferences.browserAlerts) {
        if (!browserNotificationsSupported()) {
          nextNotificationPreferences = {
            ...nextNotificationPreferences,
            browserAlerts: false,
          }
          setNotificationPreferences(nextNotificationPreferences)
          setBrowserNotificationPermission('unsupported')
          toast.error('This browser does not support native desktop notifications.')
        } else {
          const permission =
            browserNotificationPermission === 'granted'
              ? 'granted'
              : await Notification.requestPermission()

          setBrowserNotificationPermission(permission)

          if (permission !== 'granted') {
            nextNotificationPreferences = {
              ...nextNotificationPreferences,
              browserAlerts: false,
            }
            setNotificationPreferences(nextNotificationPreferences)
            toast.error(
              permission === 'denied'
                ? 'Browser alerts are blocked. Allow notifications in your browser settings to enable them.'
                : 'Browser alert permission was not granted.'
            )
          }
        }
      }

      saveWebNotificationPreferences(nextNotificationPreferences)
      toast.success('Settings saved successfully')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your system preferences and configurations"
      >
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 size-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </PageHeader>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-5 text-primary" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure basic system settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" defaultValue="I-TRACK Auto Sales" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="asia-manila">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asia-manila">Asia/Manila (GMT+8)</SelectItem>
                      <SelectItem value="asia-singapore">Asia/Singapore (GMT+8)</SelectItem>
                      <SelectItem value="asia-tokyo">Asia/Tokyo (GMT+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select defaultValue="dd-mm-yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select defaultValue="php">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="php">PHP - Philippine Peso</SelectItem>
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="sgd">SGD - Singapore Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Display Preferences</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce spacing and padding throughout the interface
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Welcome Message</Label>
                    <p className="text-sm text-muted-foreground">
                      Display greeting message on dashboard
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5 text-primary" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Email Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Vehicle Added</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when a new vehicle is added to inventory
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Preparation Complete</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when vehicle preparation is completed
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Test Drive Scheduled</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when a new test drive is scheduled
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Daily Summary</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive daily activity summary
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium">In-App Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Real-time Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Show live notifications for system events
                      </p>
                    </div>
                    <Switch
                      checked={notificationPreferences.liveUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationPreferences((current) => ({
                          ...current,
                          liveUpdates: checked,
                          browserAlerts: checked ? current.browserAlerts : false,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Browser Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Show native browser notifications when the website is open in the background.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Permission:{' '}
                        {browserNotificationPermission === 'unsupported'
                          ? 'not supported'
                          : browserNotificationPermission}
                      </p>
                    </div>
                    <Switch
                      checked={
                        notificationPreferences.liveUpdates &&
                        notificationPreferences.browserAlerts
                      }
                      disabled={!notificationPreferences.liveUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationPreferences((current) => ({
                          ...current,
                          browserAlerts: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sound Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound for important notifications
                      </p>
                    </div>
                    <Switch
                      checked={notificationPreferences.soundAlerts}
                      disabled={!notificationPreferences.liveUpdates}
                      onCheckedChange={(checked) =>
                        setNotificationPreferences((current) => ({
                          ...current,
                          soundAlerts: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Password</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div />
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Update Password
                </Button>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Two-Factor Authentication</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable 2FA</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Session Management</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Logout</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically logout after 30 minutes of inactivity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5 text-primary" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Advanced system settings and maintenance options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pagination Size</Label>
                  <Select defaultValue="10">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 items per page</SelectItem>
                      <SelectItem value="25">25 items per page</SelectItem>
                      <SelectItem value="50">50 items per page</SelectItem>
                      <SelectItem value="100">100 items per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Retention</Label>
                  <Select defaultValue="365">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Maintenance</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Clear Cache
                  </Button>
                  <Button variant="outline" size="sm">
                    Export Data
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive">
                    Reset Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5 text-primary" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Advanced system settings and maintenance options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pagination Size</Label>
                  <Select defaultValue="10">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 items per page</SelectItem>
                      <SelectItem value="25">25 items per page</SelectItem>
                      <SelectItem value="50">50 items per page</SelectItem>
                      <SelectItem value="100">100 items per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Retention</Label>
                  <Select defaultValue="365">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Email Configuration</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input id="smtpHost" placeholder="smtp.example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input id="smtpPort" placeholder="587" />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Maintenance</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    Clear Cache
                  </Button>
                  <Button variant="outline" size="sm">
                    Export Data
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive">
                    Reset Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
