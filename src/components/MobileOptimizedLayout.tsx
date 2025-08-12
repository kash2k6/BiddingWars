"use client"

import { useState, useEffect } from "react"
import { Menu, X, Home, Search, Plus, User, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import Link from "next/link"

interface MobileOptimizedLayoutProps {
  children: React.ReactNode
  experienceId: string
  currentUserId: string
  spendingPower: number
}

export function MobileOptimizedLayout({ 
  children, 
  experienceId, 
  currentUserId, 
  spendingPower 
}: MobileOptimizedLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  // Handle scroll for mobile header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const navigationItems = [
    {
      name: 'Marketplace',
      href: `/experiences/${experienceId}`,
      icon: Home,
      description: 'Browse active missions'
    },
    {
      name: 'My Bids',
      href: `/experiences/${experienceId}/bids`,
      icon: Trophy,
      description: 'Your active engagements'
    },
    {
      name: 'My Auctions',
      href: `/experiences/${experienceId}/auctions`,
      icon: User,
      description: 'Your deployed missions'
    },
    {
      name: 'Create Listing',
      href: `/experiences/${experienceId}/create`,
      icon: Plus,
      description: 'Deploy new mission'
    }
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Mobile Header */}
      <header className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${isScrolled ? 'bg-black/90 backdrop-blur-md shadow-lg' : 'bg-transparent'}
      `}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BW</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-bold text-lg">BiddingWars</h1>
            </div>
          </div>

          {/* Spending Power */}
          <div className="flex items-center gap-2">
            <div className="bg-green-600 text-white px-2 py-1 rounded text-sm font-bold">
              ${(spendingPower / 100).toFixed(2)}
            </div>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:bg-white/10 sm:hidden"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden bg-black/95 backdrop-blur-md border-t border-gray-800">
            <nav className="px-4 py-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-3 rounded-lg mb-1 transition-all duration-200
                      ${isActive(item.href) 
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' 
                        : 'text-gray-300 hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Desktop Navigation */}
      <nav className="hidden sm:flex fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                      ${isActive(item.href) 
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' 
                        : 'text-gray-300 hover:bg-white/10'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`
        pt-16 sm:pt-20 transition-all duration-300
        ${isMobileMenuOpen ? 'pt-48 sm:pt-20' : ''}
      `}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-gray-800">
        <div className="flex items-center justify-around py-2">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200
                  ${isActive(item.href) 
                    ? 'text-orange-500' 
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile Content Padding */}
      <div className="sm:hidden pb-20" />
    </div>
  )
}

// Mobile-optimized card component
export function MobileCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`
      bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 sm:p-6
      hover:bg-white/10 transition-all duration-200
      ${className}
    `}>
      {children}
    </div>
  )
}

// Mobile-optimized button component
export function MobileButton({ 
  children, 
  variant = 'default',
  className = "",
  ...props 
}: React.ComponentProps<typeof Button> & { variant?: 'default' | 'secondary' }) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 text-white'
      default:
        return 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'
    }
  }

  return (
    <Button
      className={`
        ${getVariantStyle()}
        font-medium px-4 py-3 rounded-lg transition-all duration-200
        active:scale-95 touch-manipulation
        ${className}
      `}
      {...props}
    >
      {children}
    </Button>
  )
}
