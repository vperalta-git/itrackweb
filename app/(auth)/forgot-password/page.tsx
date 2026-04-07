'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react'

import { ApiError, apiRequest } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'

type Step = 'email' | 'otp' | 'reset' | 'success'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
const PASSWORD_REQUIREMENTS_MESSAGE =
  'Password must be at least 8 characters and include at least 1 uppercase letter, 1 number, and 1 special character.'

export default function ForgotPasswordPage() {
  const [step, setStep] = React.useState<Step>('email')
  const [isLoading, setIsLoading] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [otp, setOtp] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [error, setError] = React.useState('')
  const [notice, setNotice] = React.useState('')

  const clearFeedback = () => {
    setError('')
    setNotice('')
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setIsLoading(true)

    try {
      await apiRequest<null>('/auth/forgot-password/request-otp', {
        method: 'POST',
        body: {
          email: normalizedEmail,
        },
      })

      setEmail(normalizedEmail)
      setOtp('')
      setPassword('')
      setConfirmPassword('')
      setStep('otp')
      setNotice('If an active account exists for that email, we sent a 6-digit OTP code.')
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : 'We could not send the OTP code right now. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()

    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit code.')
      return
    }

    setIsLoading(true)

    try {
      await apiRequest<null>('/auth/forgot-password/verify-otp', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        },
      })

      setStep('reset')
      setNotice('OTP verified. You can now create a new password.')
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : 'We could not verify that OTP code. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    clearFeedback()
    if (!email.trim()) return

    setIsLoading(true)

    try {
      await apiRequest<null>('/auth/forgot-password/request-otp', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
        },
      })

      setNotice('A fresh 6-digit OTP code has been sent if the account is active.')
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : 'We could not resend the OTP code right now. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()

    if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE)
      return
    }

    if (confirmPassword !== password) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)

    try {
      await apiRequest<null>('/auth/forgot-password/reset', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          nextPassword: password,
        },
      })

      setStep('success')
      setNotice('Your password has been reset. You can sign in with the new password.')
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : 'We could not reset your password right now. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="lg:hidden mb-8 text-center">
        <div className="inline-flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            I
          </div>
          <span className="block text-2xl font-bold tracking-tight">I-TRACK</span>
        </div>
      </div>

      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        {step === 'email' && (
          <>
            <CardHeader className="space-y-1 px-0 lg:px-6">
              <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
              <CardDescription>
                Enter your email address and we&apos;ll send you a one-time OTP code
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 lg:px-6">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP code'
                  )}
                </Button>

                <Button type="button" variant="ghost" className="w-full" asChild>
                  <Link href="/login">
                    <ArrowLeft className="mr-2 size-4" />
                    Back to sign in
                  </Link>
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === 'otp' && (
          <>
            <CardHeader className="space-y-1 px-0 lg:px-6">
              <CardTitle className="text-2xl font-bold">Enter the code</CardTitle>
              <CardDescription>
                We sent a 6-digit OTP code to <span className="font-medium text-foreground">{email}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 lg:px-6">
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                {notice && !error && (
                  <div className="rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">
                    {notice}
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <Label>OTP code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => {
                        setOtp(value.replace(/\D/g, ''))
                        clearFeedback()
                      }}
                      disabled={isLoading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="size-12 text-lg" />
                        <InputOTPSlot index={1} className="size-12 text-lg" />
                        <InputOTPSlot index={2} className="size-12 text-lg" />
                        <InputOTPSlot index={3} className="size-12 text-lg" />
                        <InputOTPSlot index={4} className="size-12 text-lg" />
                        <InputOTPSlot index={5} className="size-12 text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button type="submit" className="h-11 w-full" disabled={isLoading || otp.length !== 6}>
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Verifying...
                    </>
                  ) : (
                    'Verify OTP'
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Didn&apos;t receive the code?{' '}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                  >
                    Resend
                  </button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    clearFeedback()
                    setStep('email')
                  }}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Use a different email
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === 'reset' && (
          <>
            <CardHeader className="space-y-1 px-0 lg:px-6">
              <CardTitle className="text-2xl font-bold">Create a new password</CardTitle>
              <CardDescription>
                Set a strong password to finish recovering your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 lg:px-6">
              <form onSubmit={handleResetSubmit} className="space-y-4">
                {notice && !error && (
                  <div className="rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">
                    {notice}
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">{PASSWORD_REQUIREMENTS_MESSAGE}</p>

                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        clearFeedback()
                      }}
                      required
                      disabled={isLoading}
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4 text-muted-foreground" />
                      ) : (
                        <Eye className="size-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        clearFeedback()
                      }}
                      required
                      disabled={isLoading}
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="size-4 text-muted-foreground" />
                      ) : (
                        <Eye className="size-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">
                        {showConfirmPassword ? 'Hide password' : 'Show password'}
                      </span>
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Resetting password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 size-4" />
                      Reset password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === 'success' && (
          <>
            <CardHeader className="space-y-1 px-0 text-center lg:px-6">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="size-8 text-success" />
              </div>
              <CardTitle className="text-2xl font-bold">Password updated</CardTitle>
              <CardDescription>
                Your password was reset successfully for <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 lg:px-6">
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  {notice || 'You can now sign in using your new password.'}
                </p>

                <Button className="h-11 w-full" asChild>
                  <Link href="/login">Return to sign in</Link>
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
