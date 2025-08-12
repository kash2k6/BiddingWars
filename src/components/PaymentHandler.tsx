"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/payouts"
import { DollarSign, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { getIframeContext, createInAppPurchase } from "@/lib/whop-client"

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
  const [receiptId, setReceiptId] = useState<string>()
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
      const context = await getIframeContext()

      // 1. Create charge on server
      const response = await fetch("/api/charge", {
        method: "POST",
        body: JSON.stringify({ 
          userId: context.userId, 
          experienceId: context.experienceId,
          amount: amount,
          currency: 'usd',
          metadata: {
            auctionId: auctionId,
            type: 'auction_payment'
          }
        }),
      })
      
      if (response.ok) {
        const chargeResult = await response.json()
        
        // 2. Use the createInAppPurchase function from whop-client
        const res = await createInAppPurchase(chargeResult)
        
        if (res.success) {
          // Payment window opened successfully, but payment not completed yet
          setReceiptId(res.receiptId)
          setPaymentStatus('processing')
          setError(undefined)
          
          toast({
            title: "Payment Window Opened",
            description: "Please complete your payment in the new window. The auction will be finalized once payment is confirmed.",
          })
          
          // Don't call onSuccess yet - wait for actual payment completion
          // The auction will be finalized through webhooks or manual verification
        } else {
          setReceiptId(undefined)
          setPaymentStatus('failed')
          setError('Payment failed')
          throw new Error('Payment failed')
        }
      } else {
        throw new Error("Failed to create charge")
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
      case 'processing':
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Payment Window Opened
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
      case 'processing':
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
      case 'processing':
        return `${baseClass} bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white`
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
