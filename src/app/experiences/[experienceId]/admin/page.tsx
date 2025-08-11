"use client"

import { useEffect, useState } from "react"
import { checkAdminPermissions, AdminUser } from "@/lib/admin-permissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/payouts"
import { useToast } from "@/hooks/use-toast"
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package, 
  BarChart3, 
  Download,
  RefreshCw,
  Shield,
  AlertTriangle
} from "lucide-react"

interface Receipt {
  id: string
  status: string
  currency: string
  settledUsdAmount: number
  totalUsdAmount: number
  amountAfterFees: number
  paidAt: number
  member: {
    user: {
      username: string
      name: string
    }
  }
  metadata: {
    auctionId?: string
    type?: string
  }
}

interface CommissionStats {
  totalRevenue: number
  platformFees: number
  communityFees: number
  totalTransactions: number
  averageTransaction: number
}

export default function AdminPage({ params }: { params: { experienceId: string } }) {
  const { toast } = useToast()
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [stats, setStats] = useState<CommissionStats>({
    totalRevenue: 0,
    platformFees: 0,
    communityFees: 0,
    totalTransactions: 0,
    averageTransaction: 0
  })
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        setLoading(true)
        const admin = await checkAdminPermissions()
        setAdminUser(admin)
        
        if (!admin.isAdmin) {
          setAccessDenied(true)
          toast({
            title: "Access Denied",
            description: "You need admin permissions to view this page.",
            variant: "destructive",
          })
        } else {
          // Load admin data using environment company ID
          const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_PHQfLZ3o2GvXQn'
          await loadReceipts(companyId)
        }
      } catch (error) {
        console.error("Failed to check admin permissions:", error)
        setAccessDenied(true)
        toast({
          title: "Error",
          description: "Failed to verify admin permissions.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [toast])

  const loadReceipts = async (companyId?: string) => {
    try {
      if (!companyId) {
        console.log('No company ID available for admin')
        return
      }
      
      const response = await fetch(`/api/admin/receipts?companyId=${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setReceipts(data.receipts || [])
        calculateStats(data.receipts || [])
      } else {
        throw new Error('Failed to load receipts')
      }
    } catch (error) {
      console.error('Error loading receipts:', error)
      toast({
        title: "Error",
        description: "Failed to load admin data.",
        variant: "destructive",
      })
    }
  }

  const calculateStats = (receipts: Receipt[]) => {
    const totalRevenue = receipts.reduce((sum, receipt) => sum + receipt.settledUsdAmount, 0)
    const platformFees = receipts.reduce((sum, receipt) => {
      const metadata = receipt.metadata || {}
      return sum + (metadata.platformFee || 0)
    }, 0)
    const communityFees = receipts.reduce((sum, receipt) => {
      const metadata = receipt.metadata || {}
      return sum + (metadata.communityFee || 0)
    }, 0)

    setStats({
      totalRevenue,
      platformFees,
      communityFees,
      totalTransactions: receipts.length,
      averageTransaction: receipts.length > 0 ? totalRevenue / receipts.length : 0
    })
  }

  const exportReceipts = () => {
    const csvContent = [
      ['Date', 'User', 'Amount', 'Status', 'Auction ID', 'Type'].join(','),
      ...receipts.map(receipt => [
        new Date(receipt.paidAt * 1000).toLocaleDateString(),
        receipt.member?.user?.username || 'Unknown',
        formatCurrency(receipt.settledUsdAmount * 100),
        receipt.status,
        receipt.metadata?.auctionId || 'N/A',
        receipt.metadata?.type || 'N/A'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bidding-wars-receipts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg text-white">Loading admin data...</p>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">
            You need admin permissions to view this page. Only community owners can access the admin dashboard.
          </p>
          <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-300">
                                    <p><strong>Current User:</strong> {adminUser?.userId || 'Unknown'}</p>
                        <p><strong>Experience:</strong> {params.experienceId}</p>
                        <p><strong>Company ID:</strong> {adminUser?.companyId || 'None (Not a company owner)'}</p>
                        <p><strong>Role:</strong> {adminUser?.role || 'Unknown'}</p>
                        <p><strong>Company Name:</strong> {adminUser?.companyName || 'None'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">
            🛡️ ADMIN DASHBOARD 🛡️
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-sm text-purple-600 font-semibold">ADMIN</span>
          </div>
          {adminUser && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Shield className="h-4 w-4" />
              <span>User: {adminUser.userId.slice(-8)}</span>
              <span>•</span>
              <span>Role: {adminUser.role}</span>
              {adminUser.companyName && (
                <>
                  <span>•</span>
                  <span>Company: {adminUser.companyName}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {adminUser?.companyId && (
            <Button
              onClick={() => loadReceipts(adminUser.companyId)}
              variant="outline"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
          <Button
            onClick={exportReceipts}
            variant="outline"
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue * 100)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Platform Fees</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.platformFees * 100)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Community Fees</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.communityFees * 100)}</p>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Transactions</p>
                <p className="text-2xl font-bold text-white">{stats.totalTransactions}</p>
              </div>
              <Package className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Transaction</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats.averageTransaction * 100)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white">Payment Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/30">
                  <th className="text-left p-2 text-gray-400">Date</th>
                  <th className="text-left p-2 text-gray-400">User</th>
                  <th className="text-left p-2 text-gray-400">Amount</th>
                  <th className="text-left p-2 text-gray-400">Status</th>
                  <th className="text-left p-2 text-gray-400">Auction ID</th>
                  <th className="text-left p-2 text-gray-400">Type</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-purple-500/20 hover:bg-purple-500/10">
                    <td className="p-2 text-white">
                      {new Date(receipt.paidAt * 1000).toLocaleDateString()}
                    </td>
                    <td className="p-2 text-white">
                      {receipt.member?.user?.username || 'Unknown'}
                    </td>
                    <td className="p-2 text-white font-medium">
                      {formatCurrency(receipt.settledUsdAmount * 100)}
                    </td>
                    <td className="p-2">
                      <Badge 
                        variant={receipt.status === 'succeeded' ? 'default' : 'secondary'}
                        className={receipt.status === 'succeeded' ? 'bg-green-600' : 'bg-gray-600'}
                      >
                        {receipt.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-white">
                      {receipt.metadata?.auctionId || 'N/A'}
                    </td>
                    <td className="p-2 text-white">
                      {receipt.metadata?.type || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {receipts.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No payment receipts found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
