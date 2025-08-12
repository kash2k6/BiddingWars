"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter, usePathname } from "next/navigation"
import { 
  Store, 
  Gavel, 
  Package, 
  Wallet, 
  Plus, 
  Settings,
  Shield,
  ShoppingBag
} from "lucide-react"

interface NavTabsProps {
  experienceId: string
  currentTab?: string
}

export function NavTabs({ experienceId, currentTab }: NavTabsProps) {
  const router = useRouter()
  const pathname = usePathname()

  const tabs = [
    {
      id: "marketplace",
      label: "Marketplace",
      icon: Store,
      href: `/experiences/${experienceId}`
    },
    {
      id: "bids",
      label: "My Bids",
      icon: Gavel,
      href: `/experiences/${experienceId}/bids`
    },
    {
      id: "auctions",
      label: "My Auctions",
      icon: Package,
      href: `/experiences/${experienceId}/auctions`
    },
    {
      id: "barracks",
      label: "Barracks",
      icon: Shield,
      href: `/experiences/${experienceId}/barracks`
    },
    {
      id: "seller",
      label: "Seller",
      icon: ShoppingBag,
      href: `/experiences/${experienceId}/seller`
    },
    {
      id: "wallet",
      label: "Wallet",
      icon: Wallet,
      href: `/experiences/${experienceId}/wallet`
    },
    {
      id: "create",
      label: "Create Listing",
      icon: Plus,
      href: `/experiences/${experienceId}/create`
    },
    {
      id: "admin",
      label: "Admin",
      icon: Settings,
      href: `/experiences/${experienceId}/admin`
    }
  ]

  // Determine current tab from pathname
  const getCurrentTab = () => {
    if (pathname === `/experiences/${experienceId}`) return "marketplace"
    if (pathname.includes('/bids')) return "bids"
    if (pathname.includes('/auctions')) return "auctions"
    if (pathname.includes('/barracks')) return "barracks"
    if (pathname.includes('/seller')) return "seller"
    if (pathname.includes('/wallet')) return "wallet"
    if (pathname.includes('/create')) return "create"
    if (pathname.includes('/admin')) return "admin"
    return currentTab || "marketplace"
  }

  const handleTabChange = (value: string) => {
    const tab = tabs.find(t => t.id === value)
    if (tab) {
      router.push(tab.href)
    }
  }

  return (
    <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-8 bg-gradient-to-r from-orange-500 to-red-500">
                    {tabs.map((tab) => {
                      const Icon = tab.icon
                      return (
                        <TabsTrigger 
                          key={tab.id} 
                          value={tab.id} 
                          className="flex items-center gap-1 sm:gap-2 data-[state=active]:bg-white/20 data-[state=active]:text-white font-bold text-xs sm:text-sm"
                        >
                          <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>
    </Tabs>
  )
}
