"use client"

import { useEffect, useState } from "react"
import { getWhopContext } from "@/lib/whop-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SpendingPowerBadge } from "@/components/SpendingPowerBadge"
import { formatCurrency } from "@/lib/payouts"
import { createWhopClient } from "@/lib/whop"
import { Wallet, Plus, History, TrendingUp } from "lucide-react"

interface Transaction {
  id: string
  amount: number
  type: 'credit' | 'debit'
  description: string
  timestamp: string
}

export default function WalletPage({ params }: { params: { experienceId: string } }) {
  const [context, setContext] = useState<{ userId: string; companyId?: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [userStats, setUserStats] = useState<{
    totalSpent: number
    totalActiveBids: number
    activeBidCount: number
    wonAuctionsCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getContext() {
      try {
        const ctx = await getWhopContext()
        setContext({
          userId: ctx.userId,
          companyId: ctx.companyId,
        })

        // Fetch user stats
        const statsResponse = await fetch('/api/whop/user-stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: ctx.userId,
            experienceId: params.experienceId
          })
        })

        if (statsResponse.ok) {
          const stats = await statsResponse.json()
          setUserStats(stats)
        } else {
          console.error('Failed to fetch user stats')
        }
      } catch (error) {
        console.error("Failed to get Whop context:", error)
      } finally {
        setLoading(false)
      }
    }

    getContext()
  }, [params.experienceId])

  const handleAddFunds = async () => {
    try {
      // Open Whop add funds modal - redirect to Whop dashboard
      window.open("https://whop.com/dashboard/settings/checkout", "_blank")
    } catch (error) {
      console.error('Error opening add funds:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!context) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have access to this wallet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Wallet</h2>
        <Button onClick={handleAddFunds}>
          <Plus className="h-4 w-4 mr-2" />
          Add Funds
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Spending Power Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spending Power</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <SpendingPowerBadge 
                userId={context.userId} 
                companyId={context.companyId} 
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Available balance for bidding
            </p>
          </CardContent>
        </Card>

        {/* Total Spent Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(userStats?.totalSpent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              All time spending
            </p>
          </CardContent>
        </Card>

        {/* Active Bids Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bids</CardTitle>
            <Badge variant="secondary">{userStats?.activeBidCount || 0}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(userStats?.totalActiveBids || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently bidding on
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your bidding activity will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <Badge variant={transaction.type === 'credit' ? 'default' : 'secondary'}>
                      {transaction.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
