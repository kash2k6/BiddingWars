"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { createWhopClient } from "@/lib/whop"
import { formatCurrency } from "@/lib/payouts"

interface SpendingPowerBadgeProps {
  userId: string
  companyId?: string
}

export function SpendingPowerBadge({ userId, companyId }: SpendingPowerBadgeProps) {
  const [spendingPower, setSpendingPower] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSpendingPower() {
      try {
        setLoading(true)
        console.log('Fetching spending power for user:', userId)
        
        if (!userId) {
          console.log('No userId provided, skipping fetch')
          setSpendingPower(0)
          setLoading(false)
          return
        }
        
        // Create API request to get user's ledger account
        const response = await fetch('/api/whop/ledger-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            companyId
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch ledger: ${response.status}`)
        }

        const result = await response.json()
        console.log('Ledger account result:', result)
        
        console.log('Full result structure:', JSON.stringify(result, null, 2))
        
        // Get balance from the current user's ledger account
        let balance = 0
        
        // Check balanceCaches.nodes (this is the standard way according to Whop docs)
        const balanceNodes = result.user?.ledgerAccount?.balanceCaches?.nodes || []
        console.log('Balance nodes:', balanceNodes)
        
        const usdNode = balanceNodes.find(
          (node: any) => node.currency === 'usd'
        )
        
        if (usdNode) {
          balance = (usdNode.balance ?? 0) - (usdNode.pendingBalance ?? 0)
          console.log('Found USD balance:', balance, 'dollars')
        } else {
          console.log('No USD balance found in balanceCaches.nodes')
          
          // Check if there are other currencies
          if (balanceNodes.length > 0) {
            console.log('Available currencies:', balanceNodes.map((node: any) => node.currency))
          }
        }
        
        console.log('Final balance:', balance, 'dollars')
        // Convert dollars to cents for the formatCurrency function
        setSpendingPower(balance * 100)
      } catch (err) {
        console.error('Error fetching spending power:', err)
        setError('Failed to load balance')
        setSpendingPower(0)
      } finally {
        setLoading(false)
      }
    }

    fetchSpendingPower()
  }, [userId, companyId])

  if (loading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        Loading...
      </Badge>
    )
  }

  if (error) {
    return (
      <Badge variant="destructive">
        Error
      </Badge>
    )
  }

                return (
                <Badge variant="default" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg">
                  💰 Spending Power: {formatCurrency(spendingPower || 0)}
                </Badge>
              )
}
