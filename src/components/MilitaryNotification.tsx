"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Target, Trophy, Flame, Zap, Shield, Sword, Crown } from "lucide-react"

interface MilitaryNotificationProps {
  type: 'success' | 'warning' | 'error' | 'info' | 'victory' | 'defeat' | 'deployment' | 'engagement'
  title: string
  message: string
  duration?: number
  onClose?: () => void
  show?: boolean
}

export function MilitaryNotification({ 
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose, 
  show = true 
}: MilitaryNotificationProps) {
  const [isVisible, setIsVisible] = useState(show)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      setIsAnimating(true)
      
      // Auto-hide after duration
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  const getNotificationStyle = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-600 to-green-800 border-green-400'
      case 'warning':
        return 'bg-gradient-to-r from-yellow-600 to-orange-600 border-yellow-400'
      case 'error':
        return 'bg-gradient-to-r from-red-600 to-red-800 border-red-400'
      case 'info':
        return 'bg-gradient-to-r from-blue-600 to-blue-800 border-blue-400'
      case 'victory':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 border-yellow-300'
      case 'defeat':
        return 'bg-gradient-to-r from-gray-600 to-gray-800 border-gray-400'
      case 'deployment':
        return 'bg-gradient-to-r from-purple-600 to-purple-800 border-purple-400'
      case 'engagement':
        return 'bg-gradient-to-r from-orange-600 to-red-600 border-orange-400'
      default:
        return 'bg-gradient-to-r from-blue-600 to-blue-800 border-blue-400'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Target className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'error':
        return <Flame className="h-5 w-5" />
      case 'info':
        return <Shield className="h-5 w-5" />
      case 'victory':
        return <Crown className="h-5 w-5" />
      case 'defeat':
        return <Sword className="h-5 w-5" />
      case 'deployment':
        return <Zap className="h-5 w-5" />
      case 'engagement':
        return <Target className="h-5 w-5" />
      default:
        return <Shield className="h-5 w-5" />
    }
  }

  const getAnimation = () => {
    switch (type) {
      case 'victory':
        return 'animate-bounce'
      case 'defeat':
        return 'animate-pulse'
      case 'deployment':
        return 'animate-ping'
      case 'engagement':
        return 'animate-pulse'
      default:
        return ''
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div 
        className={`
          ${getNotificationStyle()}
          text-white p-4 rounded-lg shadow-xl border-2
          transform transition-all duration-300
          ${isAnimating ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
          ${getAnimation()}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`${getAnimation()}`}>
              {getIcon()}
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider">
              {title}
            </h3>
          </div>
          
          {/* Close button */}
          <button
            onClick={() => {
              setIsVisible(false)
              onClose?.()
            }}
            className="text-white/80 hover:text-white transition-colors"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-3 h-0.5 bg-current rotate-45 absolute" />
              <div className="w-3 h-0.5 bg-current -rotate-45 absolute" />
            </div>
          </button>
        </div>

        {/* Message */}
        <p className="text-sm opacity-90">
          {message}
        </p>

        {/* Progress bar */}
        <div className="mt-3 w-full bg-black/20 rounded-full h-1">
          <div 
            className="bg-white h-1 rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-2 left-2 w-1 h-1 bg-white/50 rounded-full animate-ping" />
        <div className="absolute top-2 right-2 w-1 h-1 bg-white/50 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-2 left-2 w-1 h-1 bg-white/50 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-2 right-2 w-1 h-1 bg-white/50 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// Hook for easy usage
export function useMilitaryNotification() {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    type: MilitaryNotificationProps['type']
    title: string
    message: string
    duration?: number
  }>>([])

  const addNotification = (notification: Omit<MilitaryNotificationProps, 'show' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [...prev, { ...notification, id }])
    
    // Auto-remove after duration
    setTimeout(() => {
      removeNotification(id)
    }, notification.duration || 5000)
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return {
    notifications,
    addNotification,
    removeNotification
  }
}
