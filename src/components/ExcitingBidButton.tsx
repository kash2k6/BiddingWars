"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/payouts"
import { getBidTerminology, getBidSuccessMessage } from "@/lib/bid-terminology"
import { Flame, Zap, Trophy, Target, Sword, Shield, Crown } from "lucide-react"

interface ExcitingBidButtonProps {
  amount: number
  previousAmount?: number
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  isWinning?: boolean
  variant?: 'default' | 'aggressive' | 'defensive' | 'victory'
}

export function ExcitingBidButton({ 
  amount, 
  previousAmount = 0,
  onClick, 
  disabled = false, 
  loading = false,
  isWinning = false,
  variant = 'default'
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

  const getButtonStyle = () => {
    if (isWinning) {
      return 'bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black shadow-lg shadow-yellow-500/50'
    }
    
    switch (variant) {
      case 'aggressive':
        return 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white shadow-lg shadow-red-500/50'
      case 'defensive':
        return 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg shadow-blue-500/50'
      case 'victory':
        return 'bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white shadow-lg shadow-purple-500/50'
      default:
        return 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/50'
    }
  }

  const getButtonIcon = () => {
    if (isWinning) return <Crown className="h-5 w-5 animate-bounce" />
    if (variant === 'aggressive') return <Sword className="h-5 w-5" />
    if (variant === 'defensive') return <Shield className="h-5 w-5" />
    if (variant === 'victory') return <Trophy className="h-5 w-5" />
    return <Target className={`h-5 w-5 ${isAnimating ? 'animate-ping' : ''}`} />
  }

  const getButtonText = () => {
    if (loading) return 'DEPLOYING...'
    if (isWinning) return `DOMINATE ${formatCurrency(amount)}`
    if (variant === 'aggressive') return `STRIKE ${formatCurrency(amount)}`
    if (variant === 'defensive') return `DEFEND ${formatCurrency(amount)}`
    if (variant === 'victory') return `CONQUER ${formatCurrency(amount)}`
    return `ENGAGE ${formatCurrency(amount)}`
  }

  return (
    <div className="relative">
      {/* Enhanced flame effects */}
      <div className={`absolute -top-2 -left-2 transition-all duration-300 ${isAnimating ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`}>
        <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
      </div>
      <div className={`absolute -top-2 -right-2 transition-all duration-300 ${isAnimating ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`}>
        <Flame className="h-6 w-6 text-red-500 animate-pulse" />
      </div>
      
      {/* Lightning effects */}
      <div className={`absolute -bottom-2 left-1/4 transition-all duration-300 ${isAnimating ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`}>
        <Zap className="h-5 w-5 text-yellow-400 animate-ping" />
      </div>
      <div className={`absolute -bottom-2 right-1/4 transition-all duration-300 ${isAnimating ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`}>
        <Zap className="h-5 w-5 text-blue-400 animate-ping" style={{ animationDelay: '0.3s' }} />
      </div>
      
      {/* Main button */}
      <Button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`
          relative overflow-hidden font-bold text-sm sm:text-lg px-3 sm:px-6 py-2 sm:py-3 min-w-24 sm:min-w-32 w-full
          ${getButtonStyle()}
          ${isAnimating ? 'scale-105 shadow-xl' : 'scale-100'}
          transition-all duration-200 ease-out
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          whitespace-nowrap
        `}
      >
        {/* Animated background */}
        <div className={`absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 opacity-0 ${isAnimating ? 'animate-pulse opacity-30' : ''}`} />
        
        {/* Content */}
        <div className="relative flex items-center justify-center gap-2 min-w-0">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span className="truncate">DEPLOYING...</span>
            </>
          ) : (
            <>
              {getButtonIcon()}
              <span className="truncate">{getButtonText()}</span>
            </>
          )}
        </div>
        
        {/* Enhanced sparkle effects */}
        {isAnimating && (
          <>
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
            <div className="absolute -bottom-1 left-1/2 w-2 h-2 bg-red-300 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
            <div className="absolute top-1/2 -left-1 w-2 h-2 bg-blue-300 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
            <div className="absolute top-1/2 -right-1 w-2 h-2 bg-purple-300 rounded-full animate-ping" style={{ animationDelay: '0.8s' }} />
          </>
        )}
        
        {/* Ripple effect */}
        {isAnimating && (
          <div className="absolute inset-0 bg-white/20 rounded-full scale-0 animate-ping" />
        )}
      </Button>
      
      {/* Success message overlay */}
      {bidTerminology && isAnimating && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm font-bold animate-bounce">
          {bidTerminology.successMessage}
        </div>
      )}
    </div>
  )
}
