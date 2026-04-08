import Image from 'next/image'
import itrackLogo from '@/media/itrackred.png'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <Image
                  src={itrackLogo}
                  alt="I-TRACK logo"
                  className="h-12 w-auto object-contain"
                  priority
                />
              </div>
              <span className="text-3xl font-bold tracking-tight xl:text-4xl">I-TRACK</span>
            </div>
            <p className="mt-2 text-base opacity-70">Isuzu Pasig</p>
          </div>
          
          <div className="space-y-6">
            <blockquote className="space-y-2">
              <p className="text-lg leading-relaxed opacity-90">
                Manage Isuzu Pasig&apos;s vehicle inventory with intelligent tracking,
                real-time monitoring, and clear reporting.
              </p>
            </blockquote>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                ISUZU&apos;s Vehicle Service Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm opacity-70">
            <span>Inventory</span>
            <span className="size-1 rounded-full bg-white/50" />
            <span>Tracking</span>
            <span className="size-1 rounded-full bg-white/50" />
            <span>Reports</span>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-white/5" />
        <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/5" />
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
