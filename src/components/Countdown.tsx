"use client"

import { useEffect, useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, Zap, Flame, Target, AlertTriangle } from "lucide-react"
import { SoundManager } from "@/lib/sound-effects"

interface CountdownProps {
  endTime: string
  startTime?: string // Add start time prop
  onEnd?: () => void
  className?: string
  variant?: 'default' | 'critical' | 'warning' | 'success'
  playSound?: boolean // New prop to control sound playing
  auctionStatus?: string // New prop to check auction status
}

export function Countdown({ 
  endTime, 
  startTime,
  onEnd, 
  className, 
  variant = 'default',
  playSound = false,
  auctionStatus = 'LIVE'
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isEnded, setIsEnded] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [pulseIntensity, setPulseIntensity] = useState(1)
  const soundPlayedRef = useRef(false) // Track if sound has been played

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const start = startTime ? new Date(startTime).getTime() : 0
      
      // Check if auction is scheduled/draft (hasn't started yet)
      if (startTime && now < start) {
        const timeUntilStart = start - now
        const days = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24))
        const hours = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((timeUntilStart % (1000 * 60)) / 1000)

        setTimeLeft({ days, hours, minutes, seconds })
        setIsScheduled(true)
        setIsEnded(false)
        return
      }

      const difference = end - now

      if (difference <= 0) {
        // Only mark as ended if auction status is actually ENDED
        if (auctionStatus === 'ENDED' || auctionStatus === 'PAID') {
          setIsEnded(true)
          setIsScheduled(false)
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
          onEnd?.()
        } else {
          // If auction hasn't ended yet, keep showing countdown
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
          setIsScheduled(false)
        }
        clearInterval(timer)
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft({ days, hours, minutes, seconds })
        setIsScheduled(false)

        // Play countdown sound only in last 10 seconds and only once
        if (playSound && minutes === 0 && seconds <= 10 && !soundPlayedRef.current) {
          SoundManager.playAuctionEnding()
          soundPlayedRef.current = true
        }

        // Increase pulse intensity as time runs out
        if (minutes === 0 && seconds <= 30) {
          setPulseIntensity(3)
        } else if (minutes === 0 && seconds <= 60) {
          setPulseIntensity(2)
        } else if (minutes <= 5) {
          setPulseIntensity(1.5)
        } else {
          setPulseIntensity(1)
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [endTime, startTime, onEnd, playSound, auctionStatus])

  const formatTime = (time: number) => time.toString().padStart(2, '0')
  
  const getMilitaryStatus = () => {
    if (timeLeft.days > 0) return 'DEPLOYMENT'
    if (timeLeft.hours > 0) return 'MISSION ACTIVE'
    if (timeLeft.minutes > 5) return 'ENGAGEMENT'
    if (timeLeft.minutes > 0) return 'FINAL STRIKE'
    if (timeLeft.seconds > 30) return 'CRITICAL'
    return 'NUCLEAR'
  }

  const getStatusColor = () => {
    if (timeLeft.minutes === 0 && timeLeft.seconds <= 30) return 'from-red-600 to-red-800'
    if (timeLeft.minutes === 0 && timeLeft.seconds <= 60) return 'from-orange-500 to-red-600'
    if (timeLeft.minutes <= 5) return 'from-yellow-500 to-orange-500'
    if (timeLeft.hours === 0) return 'from-blue-500 to-purple-600'
    return 'from-green-500 to-blue-600'
  }

  const getStatusIcon = () => {
    if (timeLeft.minutes === 0 && timeLeft.seconds <= 30) return <Flame className="h-3 w-3" />
    if (timeLeft.minutes === 0 && timeLeft.seconds <= 60) return <AlertTriangle className="h-3 w-3" />
    if (timeLeft.minutes <= 5) return <Zap className="h-3 w-3" />
    return <Target className="h-3 w-3" />
  }

  const formatDisplay = () => {
    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${formatTime(timeLeft.hours)}h ${formatTime(timeLeft.minutes)}m ${formatTime(timeLeft.seconds)}s`
    } else if (timeLeft.hours > 0) {
      return `${formatTime(timeLeft.hours)}h ${formatTime(timeLeft.minutes)}m ${formatTime(timeLeft.seconds)}s`
    } else if (timeLeft.minutes > 0) {
      return `${formatTime(timeLeft.minutes)}m ${formatTime(timeLeft.seconds)}s`
    } else {
      return `${formatTime(timeLeft.seconds)}s`
    }
  }

  const isCritical = timeLeft.minutes === 0 && timeLeft.seconds <= 30
  const isWarning = timeLeft.minutes === 0 && timeLeft.seconds <= 60
  const isEngagement = timeLeft.minutes <= 5

  // Show "Starting Soon" for scheduled auctions
  if (isScheduled) {
    return (
      <div className={`text-center ${className}`}>
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white px-3 py-2 rounded-lg shadow-lg border border-blue-500/50 transform transition-all duration-300">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-sm font-bold tracking-wider">STARTING SOON</span>
          </div>
          <div className="text-xs mt-1 opacity-90">
            {formatDisplay()}
          </div>
        </div>
      </div>
    )
  }

  // Only show "Mission Complete" if auction is actually ended
  if (isEnded && (auctionStatus === 'ENDED' || auctionStatus === 'PAID')) {
    return (
      <div className={`text-center ${className}`}>
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-500/50 transform transition-all duration-300">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span className="text-sm font-bold tracking-wider">MISSION COMPLETE</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`text-center ${className}`}>
      <div 
        className={`
          bg-gradient-to-r ${getStatusColor()} 
          text-white px-3 py-2 rounded-lg shadow-lg border border-white/20
          transform transition-all duration-300
          ${isCritical ? 'animate-pulse scale-105' : ''}
          ${isWarning ? 'animate-bounce' : ''}
          ${isEngagement ? 'animate-pulse' : ''}
        `}
        style={{
          animationDuration: `${pulseIntensity}s`
        }}
      >
        {/* Status Bar */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className={`w-2 h-2 bg-white rounded-full ${isCritical ? 'animate-ping' : 'animate-pulse'}`} />
          <span className="text-xs font-bold tracking-wider uppercase">
            {getMilitaryStatus()}
          </span>
          {getStatusIcon()}
        </div>

        {/* Countdown Display */}
        <div className="text-sm tracking-wider font-mono font-bold relative">
          {formatDisplay()}
          
          {/* Critical Effects */}
          {isCritical && (
            <>
              <div className="absolute -top-1 -right-1 text-lg animate-bounce">
                🔥
              </div>
              <div className="absolute -bottom-1 -left-1 text-lg animate-ping">
                ⚡
              </div>
            </>
          )}
          
          {/* Warning Effects */}
          {isWarning && !isCritical && (
            <div className="absolute -top-1 -right-1 text-sm animate-pulse">
              ⚠️
            </div>
          )}
          
          {/* Engagement Effects */}
          {isEngagement && !isWarning && (
            <div className="absolute -top-1 -right-1 text-sm animate-bounce">
              🎯
            </div>
          )}
        </div>

        {/* Progress Bar for last 5 minutes */}
        {timeLeft.minutes <= 5 && (
          <div className="mt-1 w-full bg-black/20 rounded-full h-1">
            <div 
              className="bg-white h-1 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${((timeLeft.minutes * 60 + timeLeft.seconds) / (5 * 60)) * 100}%`
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
