"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

interface CountdownProps {
  endTime: string
  onEnd?: () => void
  className?: string
}

export function Countdown({ endTime, onEnd, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isEnded, setIsEnded] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const difference = end - now

      if (difference <= 0) {
        setIsEnded(true)
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        onEnd?.()
        clearInterval(timer)
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft({ days, hours, minutes, seconds })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [endTime, onEnd])

  const formatTime = (time: number) => time.toString().padStart(2, '0')
  
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

  // Add flame effect for last 30 seconds or random chance
  const isLast30Seconds = timeLeft.minutes === 0 && timeLeft.seconds <= 30
  const hasFlames = isLast30Seconds || Math.random() < 0.1 // 10% chance for random flames

  if (isEnded) {
    return (
      <div className={`text-center ${className}`}>
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-2 py-1 rounded shadow-lg border border-gray-500/50">
          <div className="text-xs tracking-wide">
            ENDED
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`text-center ${className}`}>
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-2 py-1 rounded shadow-lg border border-red-400/50">
        <div className="flex items-center justify-center gap-1 mb-1">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-xs font-medium">LIVE</span>
        </div>
        <div className="text-sm tracking-wider font-mono relative">
          {formatDisplay()}
          {hasFlames && (
            <div className="absolute -top-1 -right-1 text-xs animate-bounce">
              🔥
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
