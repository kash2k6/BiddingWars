import { NavTabs } from "@/components/NavTabs"
import { SpendingPowerBadge } from "@/components/SpendingPowerBadge"

export default function AuctionDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { experienceId: string }
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                BIDDING WARS
              </h1>
              <div className="hidden sm:block text-sm text-gray-400">
                Experience: {params.experienceId}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SpendingPowerBadge />
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="mt-4">
            <NavTabs experienceId={params.experienceId} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
