"use client"

import { useEffect, useState } from "react"
import { getWhopContext } from "@/lib/whop-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AdminUser {
  userId: string
  experienceId: string
  companyId?: string
  isAdmin: boolean
  role: 'owner' | 'admin' | 'user'
  companyName?: string
}
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
  AlertTriangle,
  Send,
  User
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
  
  // Manual payout state
  const [payoutRecipient, setPayoutRecipient] = useState('')
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutNotes, setPayoutNotes] = useState('')
  const [payoutLoading, setPayoutLoading] = useState(false)
  
  // Community owner state
  const [communityOwner, setCommunityOwner] = useState<any>(null)
  const [auctions, setAuctions] = useState<any[]>([])
  const [selectedAuction, setSelectedAuction] = useState('')
  const [payoutBreakdown, setPayoutBreakdown] = useState<any>(null)
  const [transferFee, setTransferFee] = useState<any>(null)
  const [ledgerBalance, setLedgerBalance] = useState<number>(0)

  useEffect(() => {
    async function checkAdmin() {
      try {
        setLoading(true)
        
        // Get Whop context first
        const context = await getWhopContext()
        if (!context) {
          throw new Error('Failed to get Whop context')
        }

        // Check admin permissions using the API
        const response = await fetch('/api/admin/check-permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-whop-user-token': context.userId,
            'x-whop-experience-id': context.experienceId,
            'x-whop-company-id': context.companyId || '',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to check admin permissions')
        }

        const admin: AdminUser = await response.json()
        setAdminUser(admin)
        
        if (!admin.isAdmin) {
          setAccessDenied(true)
          toast({
            title: "Access Denied",
            description: "You need admin permissions to view this page.",
            variant: "destructive",
          })
        } else {
          // Load admin data using the company ID from the API response
          if (admin.companyId) {
            await loadReceipts(admin.companyId)
          }
          // Load community owner and auctions
          await loadCommunityOwner(admin.experienceId)
          await loadAuctions(admin.experienceId)
          if (admin.companyId) {
            await loadTransferFee(admin.companyId)
          }
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
      return sum + ((metadata as any).platformFee || 0)
    }, 0)
    const communityFees = receipts.reduce((sum, receipt) => {
      const metadata = receipt.metadata || {}
      return sum + ((metadata as any).communityFee || 0)
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

  const loadCommunityOwner = async (experienceId: string) => {
    try {
      const response = await fetch(`/api/get-community-owner?experienceId=${experienceId}`)
      if (response.ok) {
        const data = await response.json()
        setCommunityOwner(data.communityOwner)
      }
    } catch (error) {
      console.error('Error loading community owner:', error)
    }
  }

  const loadAuctions = async (experienceId: string) => {
    try {
      // Get ALL auctions data across entire database
      const response = await fetch(`/api/admin/all-auctions-data`)
      if (response.ok) {
        const data = await response.json()
        setAuctions(data.auctions || [])
        
        // Update stats with comprehensive data
        if (data.statistics) {
          setStats({
            totalRevenue: data.statistics.totalRevenue,
            platformFees: data.statistics.totalRevenue * 0.05, // Estimate 5% platform fee
            communityFees: data.statistics.totalRevenue * 0.10, // Estimate 10% community fee
            totalTransactions: data.statistics.paidAuctions,
            averageTransaction: data.statistics.paidAuctions > 0 ? data.statistics.totalRevenue / data.statistics.paidAuctions : 0
          })
        }
      } else {
        // Fallback to experience-specific data
        const fallbackResponse = await fetch(`/api/admin/auctions-with-payment-status?experienceId=${experienceId}`)
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          setAuctions(fallbackData.auctions || [])
        }
      }
    } catch (error) {
      console.error('Error loading auctions:', error)
    }
  }

  const handleManualPaymentVerification = async (auctionId: string) => {
    try {
      const response = await fetch('/api/cron/verify-payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET_KEY || 'biddingwars876-secret-cron-key-2024'}`
        }
      })
      
      if (response.ok) {
        toast({
          title: "Payment verification triggered",
          description: "Cron job has been manually executed.",
        })
        // Reload auctions to get updated status
        if (adminUser?.experienceId) {
          await loadAuctions(adminUser.experienceId)
        }
      } else {
        toast({
          title: "Verification failed",
          description: "Failed to trigger payment verification.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger payment verification.",
        variant: "destructive",
      })
    }
  }

  const loadPayoutBreakdown = async (auctionId: string) => {
    try {
      const response = await fetch(`/api/get-auction-payout-breakdown?auctionId=${auctionId}`)
      if (response.ok) {
        const data = await response.json()
        setPayoutBreakdown(data)
      }
    } catch (error) {
      console.error('Error loading payout breakdown:', error)
    }
  }

  const loadTransferFee = async (companyId: string) => {
    try {
      const response = await fetch(`/api/get-transfer-fee?companyId=${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setTransferFee(data.transferFee)
        // Get USD balance
        const usdBalance = data.ledgerAccount.balanceCaches.nodes.find(
          (node: any) => node.currency === 'usd'
        )
        setLedgerBalance(usdBalance?.balance || 0)
      }
    } catch (error) {
      console.error('Error loading transfer fee:', error)
    }
  }

  const handleManualPayout = async () => {
    if (!payoutRecipient || !payoutAmount || !adminUser?.experienceId) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    const amount = parseFloat(payoutAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      })
      return
    }

    // Check if we have enough balance
    const totalCost = amount + (transferFee?.dollars || 0)
    if (ledgerBalance < totalCost) {
      toast({
        title: "Insufficient funds",
        description: `You need $${totalCost.toFixed(2)} but only have $${ledgerBalance.toFixed(2)} available.`,
        variant: "destructive",
      })
      return
    }

    setPayoutLoading(true)
    try {
      const response = await fetch('/api/manual-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientUserId: payoutRecipient,
          amount: amount,
          experienceId: adminUser.experienceId,
          notes: payoutNotes || `Manual payout to ${payoutRecipient}`
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Payout successful",
          description: result.message,
        })
        // Clear form
        setPayoutRecipient('')
        setPayoutAmount('')
        setPayoutNotes('')
      } else {
        toast({
          title: "Payout failed",
          description: result.error || "Failed to process payout",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Payout failed",
        description: "An error occurred while processing the payout.",
        variant: "destructive",
      })
    } finally {
      setPayoutLoading(false)
    }
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

      {/* Comprehensive Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

        <Card className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Auctions</p>
                <p className="text-2xl font-bold text-white">{auctions.length}</p>
              </div>
              <Package className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Payout Section */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Send className="h-5 w-5" />
            Manual Payout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient User ID
              </label>
              <input
                type="text"
                value={payoutRecipient}
                onChange={(e) => setPayoutRecipient(e.target.value)}
                placeholder="user_xxxxxxxxx"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (USD)
              </label>
              <input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="10.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Reason for payout"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button
              onClick={handleManualPayout}
              disabled={payoutLoading || !payoutRecipient || !payoutAmount}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold"
            >
              {payoutLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Payout
                </>
              )}
            </Button>
          </div>
          <div className="mt-3 text-sm text-gray-400">
            <p><strong>Your User ID:</strong> {adminUser?.userId}</p>
            <p><strong>Company ID:</strong> {adminUser?.companyId || 'None'}</p>
            <p><strong>Experience ID:</strong> {adminUser?.experienceId}</p>
            {transferFee && (
              <div className="mt-3 p-3 bg-blue-900/30 rounded border border-blue-500/30">
                <p className="text-sm text-blue-300">
                  <strong>💰 Company Ledger Balance:</strong> ${ledgerBalance.toFixed(2)}
                </p>
                <p className="text-sm text-blue-300">
                  <strong>💸 Transfer Fee:</strong> ${transferFee.dollars.toFixed(2)} per payout
                </p>
                            <p className="text-sm text-yellow-300 mt-1">
              <strong>⚠️ Total Cost:</strong> Amount + ${transferFee.dollars.toFixed(2)} fee
            </p>
            <p className="text-sm text-green-300 mt-1">
              <strong>✅ Minimum Payout:</strong> $1.00 (Whop requirement)
            </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Community Owner Info */}
      {communityOwner && (
        <Card className="bg-gradient-to-br from-slate-800/80 to-blue-800/80 backdrop-blur-sm border border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Community Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Community</p>
                <p className="text-white font-medium">{communityOwner.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Owner</p>
                <p className="text-white font-medium">{communityOwner.ownerUsername || communityOwner.ownerUserId || 'Unknown'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auction Payouts Section */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-green-800/80 backdrop-blur-sm border border-green-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Auction Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Auction
              </label>
              <select
                value={selectedAuction}
                onChange={(e) => {
                  setSelectedAuction(e.target.value)
                  if (e.target.value) {
                    loadPayoutBreakdown(e.target.value)
                  } else {
                    setPayoutBreakdown(null)
                  }
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select an auction...</option>
                {auctions.map((auction) => (
                  <option key={auction.id} value={auction.id}>
                    {auction.title} - ${(auction.winning_bids?.[0]?.amount_cents || 0) / 100}
                  </option>
                ))}
              </select>
            </div>

            {payoutBreakdown && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Payout Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Total Amount</p>
                    <p className="text-white font-medium">${payoutBreakdown.payoutBreakdown.totalAmount}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Your App Fee</p>
                    <p className="text-white font-medium">${payoutBreakdown.payoutBreakdown.platformFee}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Seller Payout</p>
                    <p className="text-white font-medium">${payoutBreakdown.payoutBreakdown.sellerAmount}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Community Owner Payout</p>
                    <p className="text-white font-medium">${payoutBreakdown.payoutBreakdown.communityOwnerAmount}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => {
                      // Execute seller payout
                      setPayoutRecipient(payoutBreakdown.auction.sellerUserId)
                      setPayoutAmount(payoutBreakdown.payoutBreakdown.sellerAmount.toString())
                      setPayoutNotes(`Seller payout for auction ${payoutBreakdown.auction.id}`)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    Pay Seller
                  </Button>
                  {communityOwner?.ownerUserId && (
                    <Button
                      onClick={() => {
                        // Execute community owner payout
                        setPayoutRecipient(communityOwner.ownerUserId)
                        setPayoutAmount(payoutBreakdown.payoutBreakdown.communityOwnerAmount.toString())
                        setPayoutNotes(`Community owner payout for auction ${payoutBreakdown.auction.id}`)
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm"
                    >
                      Pay Community Owner
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Auctions Management Section */}
      <Card className="bg-gradient-to-br from-slate-800/80 to-orange-800/80 backdrop-blur-sm border border-orange-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            ALL Auctions Management (Entire Database)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-white font-medium">All Auctions Across All Experiences ({auctions.length})</h4>
              <Button
                onClick={() => adminUser?.experienceId && loadAuctions(adminUser.experienceId)}
                variant="outline"
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All Data
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-orange-500/30">
                    <th className="text-left p-2 text-gray-400">Title</th>
                    <th className="text-left p-2 text-gray-400">Experience</th>
                    <th className="text-left p-2 text-gray-400">Type</th>
                    <th className="text-left p-2 text-gray-400">Status</th>
                    <th className="text-left p-2 text-gray-400">Winner</th>
                    <th className="text-left p-2 text-gray-400">Amount</th>
                    <th className="text-left p-2 text-gray-400">Bids</th>
                    <th className="text-left p-2 text-gray-400">Payment</th>
                    <th className="text-left p-2 text-gray-400">Created</th>
                    <th className="text-left p-2 text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions.map((auction) => (
                    <tr key={auction.id} className="border-b border-orange-500/20 hover:bg-orange-500/10">
                      <td className="p-2 text-white font-medium">
                        <div className="max-w-xs truncate" title={auction.title}>
                          {auction.title}
                        </div>
                      </td>
                      <td className="p-2 text-white">
                        <div className="text-xs">
                          <div className="font-mono">{auction.experience_id?.slice(-8)}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge 
                          variant="outline"
                          className={auction.type === 'PHYSICAL' ? 'border-blue-500 text-blue-400' : 'border-green-500 text-green-400'}
                        >
                          {auction.type}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge 
                          variant={auction.status === 'LIVE' ? 'default' : 'secondary'}
                          className={auction.status === 'LIVE' ? 'bg-green-600' : auction.status === 'ENDED' ? 'bg-orange-600' : 'bg-gray-600'}
                        >
                          {auction.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-white">
                        <div className="text-xs">
                          <div>Winner: {auction.winner_user_id || auction.winning_bid?.user_id || 'No winner'}</div>
                          <div className="text-gray-400">Creator: {auction.created_by_user_id?.slice(-8)}</div>
                        </div>
                      </td>
                      <td className="p-2 text-white font-medium">
                        ${(auction.winning_bid?.amount_cents || auction.highest_bid_cents || 0) / 100}
                      </td>
                      <td className="p-2 text-white">
                        <div className="text-xs">
                          <div>{auction.total_bids || 0} bids</div>
                          <div className="text-gray-400">Start: ${(auction.start_price_cents || 0) / 100}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge 
                          variant="outline"
                          className={auction.payment_status === 'PAID' ? 'border-green-500 text-green-400' : 
                                   auction.payment_status === 'PENDING' ? 'border-yellow-500 text-yellow-400' : 
                                   'border-red-500 text-red-400'}
                        >
                          {auction.payment_status || 'UNKNOWN'}
                        </Badge>
                      </td>
                      <td className="p-2 text-white">
                        <div className="text-xs">
                          <div>{new Date(auction.created_at).toLocaleDateString()}</div>
                          <div className="text-gray-400">{new Date(auction.created_at).toLocaleTimeString()}</div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          {auction.winning_bid && auction.payment_status !== 'PAID' && (
                            <Button
                              onClick={() => handleManualPaymentVerification(auction.id)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                            >
                              Verify
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              setSelectedAuction(auction.id)
                              loadPayoutBreakdown(auction.id)
                            }}
                            size="sm"
                            variant="outline"
                            className="border-purple-500 text-purple-400 hover:bg-purple-500/20 text-xs"
                          >
                            Payout
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {auctions.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No auctions found in database.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
