"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { NavTabs } from "./NavTabs"
import { SpendingPowerBadge } from "./SpendingPowerBadge"

interface ExcitingLayoutProps {
  children: ReactNode
  experienceId: string
  userId?: string
  companyId?: string
}

export function ExcitingLayout({ children, experienceId, userId, companyId }: ExcitingLayoutProps) {
  const pathname = usePathname()
  
  // Check if we're on an auction detail page
  const isAuctionDetailPage = pathname.includes('/auction/')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating particles */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-yellow-400 rounded-full animate-pulse opacity-60" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-20 w-1 h-1 bg-orange-400 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-pulse opacity-30" style={{ animationDelay: '3s' }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="h-full w-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-800/80 to-purple-800/80 backdrop-blur-sm border-b border-purple-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 sm:h-16 gap-4">
              {/* Logo and title */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">⚔️</span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                    BIDDING WARS
                  </h1>
                </div>
                <div className="hidden md:block">
                  <span className="text-sm text-gray-300">
                    Experience: {experienceId}
                  </span>
                </div>
              </div>

              {/* Search and filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search auctions..."
                    className="w-full sm:w-64 px-4 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <div className="absolute right-3 top-2.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                
                <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                  <span>Filters</span>
                </button>

                {/* Spending Power */}
                {userId && (
                  <SpendingPowerBadge userId={userId} companyId={companyId} />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Navigation - Hide on auction detail pages */}
        {!isAuctionDetailPage && (
          <div className="bg-gradient-to-r from-slate-800/60 to-purple-800/60 backdrop-blur-sm border-b border-purple-500/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <NavTabs experienceId={experienceId} />
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
