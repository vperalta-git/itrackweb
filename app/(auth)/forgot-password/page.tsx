'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Spinner } from '@/components/ui/spinner'

type Step = 'email' | 'otp' | 'success'

export default function ForgotPasswordPage() {
  const [step, setStep] = React.useState<Step>('email')
  const [isLoading, setIsLoading] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [otp, setOtp] = React.useState('')
  const [error, setError] = React.useState('')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock validation
    if (email) {
      setStep('otp')
    } else {
      setError('Please enter a valid email address')
    }
    setIsLoading(false)
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock validation - accept any 6-digit code
    if (otp.length === 6) {
      setStep('success')
    } else {
      setError('Please enter the complete 6-digit code')
    }
    setIsLoading(false)
  }

  const handleResendOtp = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    // Show success message or toast
  }

  return (
    <div className="space-y-6">
      {/* Mobile Logo */}
      <div className="lg:hidden text-center mb-8">
        <div className="inline-flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            I
          </div>
          <span className="text-2xl font-bold tracking-tight">I-TRACK</span>
        </div>
      </div>

      <Card className="border-0 shadow-none lg:border lg:shadow-sm">
        {/* Step 1: Email */}
        {step === 'email' && (
          <>
            <CardHeader className="space-y-1 px-0 lg:px-6">
              <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
              <CardDescription>
                Enter your email address and we&apos;ll send you a verification code
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 lg:px-6">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
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

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Sending code...
                    </>
                  ) : (
                    'Send verification code'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  asChild
                >
                  <Link href="/login">
                    <ArrowLeft className="mr-2 size-4" />
                    Back to sign in
                  </Link>
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <>
            <CardHeader className="space-y-1 px-0 lg:px-6">
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription>
                We sent a verification code to{' '}
                <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 lg:px-6">
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <Label>Verification code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
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

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Verifying...
                    </>
                  ) : (
                    'Verify code'
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Didn&apos;t receive the code?{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
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
                  onClick={() => setStep('email')}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Use a different email
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <>
            <CardHeader className="space-y-1 px-0 lg:px-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
                <Mail className="size-8 text-success" />
              </div>
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription>
                We&apos;ve sent a password reset link to{' '}
                <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 lg:px-6">
              <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
                  Click the link in the email to reset your password. 
                  If you don&apos;t see it, check your spam folder.
                </p>

                <Button
                  className="w-full h-11"
                  asChild
                >
                  <Link href="/login">
                    Return to sign in
                  </Link>
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Didn&apos;t receive the email?{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => {
                      setStep('email')
                      setOtp('')
                    }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
