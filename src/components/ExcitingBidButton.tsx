"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/payouts"
import { getBidTerminology, getBidSuccessMessage } from "@/lib/bid-terminology"
import { Flame, Zap, Trophy } from "lucide-react"

interface ExcitingBidButtonProps {
  amount: number
  previousAmount?: number
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  isWinning?: boolean
}

export function ExcitingBidButton({ 
  amount, 
  previousAmount = 0,
  onClick, 
  disabled = false, 
  loading = false,
  isWinning = false 
}: ExcitingBidButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [bidTerminology, setBidTerminology] = useState<any>(null)
  
  console.log('ExcitingBidButton props:', { amount, previousAmount, disabled, loading, isWinning })

  const handleClick = () => {
    if (disabled || loading) return
    
    // Calculate bid terminology
    const terminology = getBidTerminology(amount, previousAmount)
    setBidTerminology(terminology)
    setIsAnimating(true)
    onClick()
    
    // Reset animation after 2 seconds
    setTimeout(() => {
      setIsAnimating(false)
      setBidTerminology(null)
    }, 2000)
  }

  return (
    <div className="relative">
      {/* Flame effects */}
      <div className={`absolute -top-2 -left-2 transition-all duration-300 ${isAnimating ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`}>
        <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
      </div>
      <div className={`absolute -top-2 -right-2 transition-all duration-300 ${isAnimating ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`}>
        <Flame className="h-6 w-6 text-red-500 animate-pulse" />
      </div>
      
      {/* Main button */}
                        <Button
                    onClick={handleClick}
                    disabled={disabled || loading}
                    className={`
                      relative overflow-hidden font-bold text-sm sm:text-lg px-3 sm:px-6 py-2 sm:py-3 min-w-24 sm:min-w-32 w-full
                      ${isWinning 
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black shadow-lg shadow-yellow-500/50' 
                        : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/50'
                      }
                      ${isAnimating ? 'scale-105 shadow-xl' : 'scale-100'}
                      transition-all duration-200 ease-out
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                    `}
                  >
        {/* Animated background */}
        <div className={`absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 opacity-0 ${isAnimating ? 'animate-pulse opacity-30' : ''}`} />
        
        {/* Content */}
        <div className="relative flex items-center gap-2">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Bidding...</span>
            </>
          ) : (
            <>
              {isWinning ? (
                <Trophy className="h-5 w-5 animate-bounce" />
              ) : (
                <Zap className={`h-5 w-5 ${isAnimating ? 'animate-ping' : ''}`} />
              )}
              <span>BID {formatCurrency(amount)}</span>
            </>
          )}
        </div>
        
        {/* Sparkle effects */}
        {isAnimating && (
          <>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
            <div className="absolute -bottom-1 left-1/2 w-2 h-2 bg-red-300 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
          </>
        )}
      </Button>
      
      {/* Success message */}
      {isAnimating && bidTerminology && (
        <div className={`absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r ${bidTerminology.color} text-white px-4 py-2 rounded-full text-sm font-bold animate-bounce shadow-lg`}>
          {getBidSuccessMessage(bidTerminology)}
        </div>
      )}
    </div>
  )
}
