'use client'

import * as React from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE_URL } from '@/lib/api-base-url'
import { apiRequest, ApiError } from '@/lib/api-client'
import { logAuditEvent } from '@/lib/audit-log'
import { buildRolePath } from '@/lib/rbac'
import { mapAuthUserFromBackend, saveSession } from '@/lib/session'
import { syncUsersFromBackend } from '@/lib/user-data'

export default function LoginPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    remember: false,
  })
  const [error, setError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await apiRequest<{
        token: string
        user: {
          id?: string
          _id?: string
          firstName?: string
          lastName?: string
          email?: string
          phone?: string
          bio?: string
          avatarUrl?: string | null
          role?: string
          managerId?:
            | string
            | {
                id?: string
                _id?: string
                firstName?: string
                lastName?: string
              }
            | null
        }
      }>('/auth/login', {
        method: 'POST',
        body: {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        },
      })

      const user = mapAuthUserFromBackend(response.user)

      if (!user.routeRole) {
        setError(
          'This account does not have access to the web dashboard. Use an admin, supervisor, manager, or sales agent account.'
        )
        setIsLoading(false)
        return
      }

      saveSession({
        token: response.token,
        remember: formData.remember,
        user,
      })

      void syncUsersFromBackend().catch(() => {
        return null
      })

      logAuditEvent({
        user: `${user.firstName} ${user.lastName}`.trim(),
        action: 'LOGIN',
        module: 'Authentication',
        description: `${user.email} signed in successfully.`,
      })

      window.location.assign(buildRolePath(user.routeRole, 'dashboard'))
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : error instanceof TypeError
          ? `Cannot reach the backend at ${API_BASE_URL}. Make sure the backend server is running.`
          : 'Unable to sign in right now.'
      )
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mobile Logo */}
      <div className="lg:hidden text-center mb-8">
        <div className="inline-flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            IP
          </div>
          <div className="text-left">
            <span className="text-2xl font-bold tracking-tight block">I-TRACK</span>
            <span className="text-xs text-muted-foreground">Isuzu Pasig</span>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        <CardHeader className="space-y-1 px-0 lg:px-6">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 lg:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-4 text-muted-foreground" />
                  ) : (
                    <Eye className="size-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showPassword ? 'Hide password' : 'Show password'}
                  </span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={formData.remember}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, remember: checked as boolean })
                  }
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember"
                  className="cursor-pointer text-sm font-normal text-muted-foreground"
                >
                  Remember me
                </Label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  )
}
