"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/payouts"
import { DollarSign, CheckCircle, XCircle, Loader2 } from "lucide-react"


interface PaymentHandlerProps {
  auctionId: string
  amount: number
  onSuccess?: () => void
  onError?: (error: string) => void
  disabled?: boolean
}

export function PaymentHandler({ 
  auctionId, 
  amount, 
  onSuccess, 
  onError, 
  disabled = false 
}: PaymentHandlerProps) {
  const [loading, setLoading] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle')
  const [error, setError] = useState<string>()
  const { toast } = useToast()
  
  console.log('PaymentHandler props:', { auctionId, amount, disabled })

  const handlePayment = async () => {
    if (disabled || loading) return

    setLoading(true)
    setPaymentStatus('processing')
    setError(undefined)

    try {
      // Get the current Whop context
      const contextResponse = await fetch('/api/whop-context')
      if (!contextResponse.ok) {
        throw new Error('Failed to get user context')
      }
      const context = await contextResponse.json()

      // Create charge and process payment
      const response = await fetch(`/api/auctions/${auctionId}/finalize`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          auctionId,
          userId: context.userId, 
          experienceId: context.experienceId,
          companyId: context.companyId,
          type: 'buy_now'
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        setPaymentStatus('success')
        setError(undefined)
        
        toast({
          title: "Payment Successful! 🎉",
          description: `You've won the auction for ${formatCurrency(amount)}!`,
        })
        onSuccess?.()
      } else {
        const errorData = await response.json()
        setPaymentStatus('failed')
        setError(errorData.error || 'Payment failed')
        throw new Error(errorData.error || 'Payment failed')
      }
    } catch (error) {
      console.error('Payment error:', error)
      setPaymentStatus('failed')
      const errorMessage = error instanceof Error ? error.message : 'Payment failed'
      setError(errorMessage)
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      })
      
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getButtonContent = () => {
    if (loading) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing Payment...
        </>
      )
    }

    switch (paymentStatus) {
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Payment Successful!
          </>
        )
      case 'failed':
        return (
          <>
            <XCircle className="h-4 w-4 mr-2" />
            Payment Failed
          </>
        )
      default:
        return (
          <>
            <DollarSign className="h-4 w-4 mr-2" />
            Pay {formatCurrency(amount)}
          </>
        )
    }
  }

  const getButtonVariant = () => {
    switch (paymentStatus) {
      case 'success':
        return 'default' as const
      case 'failed':
        return 'destructive' as const
      default:
        return 'default' as const
    }
  }

  const getButtonClassName = () => {
    const baseClass = "font-bold text-sm sm:text-lg px-3 sm:px-6 py-2 sm:py-3 min-w-24 sm:min-w-32 w-full"
    
    switch (paymentStatus) {
      case 'success':
        return `${baseClass} bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white`
      case 'failed':
        return `${baseClass} bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white`
      default:
        return `${baseClass} bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white`
    }
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || loading || paymentStatus === 'success'}
      variant={getButtonVariant()}
      className={getButtonClassName()}
    >
      {getButtonContent()}
    </Button>
  )
}
