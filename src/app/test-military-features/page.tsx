"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Countdown } from "@/components/Countdown"
import { ExcitingBidButton } from "@/components/ExcitingBidButton"
import { MilitaryNotification, useMilitaryNotification } from "@/components/MilitaryNotification"
import { MobileCard, MobileButton } from "@/components/MobileOptimizedLayout"
import { 
  Target, 
  Trophy, 
  Flame, 
  Zap, 
  Shield, 
  Sword, 
  Crown,
  Clock,
  AlertTriangle
} from "lucide-react"

export default function TestMilitaryFeaturesPage() {
  const { notifications, addNotification, removeNotification } = useMilitaryNotification()
  const [testTime, setTestTime] = useState(new Date(Date.now() + 30000).toISOString()) // 30 seconds from now

  const testNotifications = () => {
    addNotification({
      type: 'deployment',
      title: 'MISSION DEPLOYED',
      message: 'Your auction has been successfully launched into the battlefield!',
      duration: 3000
    })

    setTimeout(() => {
      addNotification({
        type: 'engagement',
        title: 'ENEMY DETECTED',
        message: 'A rival bidder has entered the combat zone!',
        duration: 3000
      })
    }, 1000)

    setTimeout(() => {
      addNotification({
        type: 'victory',
        title: 'MISSION ACCOMPLISHED',
        message: 'You have successfully conquered this auction!',
        duration: 4000
      })
    }, 2000)
  }

  const testBidVariants = () => {
    addNotification({
      type: 'info',
      title: 'BID VARIANTS TESTED',
      message: 'All military bid button variants have been deployed!',
      duration: 3000
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Card className="bg-gradient-to-r from-purple-900 to-blue-900 border-purple-500/50">
        <CardHeader>
          <CardTitle className="text-white text-center text-2xl font-bold">
            🎮 MILITARY GAMING FEATURES TEST 🎮
          </CardTitle>
          <p className="text-gray-300 text-center">
            Test all the new military terminology, animations, and mobile optimizations
          </p>
        </CardHeader>
      </Card>

      {/* Countdown Test */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Real-Time Countdown Effects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Countdown 
              endTime={testTime} 
              onEnd={() => {
                addNotification({
                  type: 'victory',
                  title: 'COUNTDOWN COMPLETE',
                  message: 'The mission timer has reached zero!',
                  duration: 3000
                })
              }}
              playSound={true}
              auctionStatus="LIVE"
            />
          </div>
          <div className="text-center">
            <Button 
              onClick={() => setTestTime(new Date(Date.now() + 30000).toISOString())}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Reset Timer (30s)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bid Button Variants */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Military Bid Button Variants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-white font-medium mb-2">Default Engagement</h4>
              <ExcitingBidButton
                amount={1000}
                onClick={testBidVariants}
              />
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Aggressive Strike</h4>
              <ExcitingBidButton
                amount={1500}
                variant="aggressive"
                onClick={testBidVariants}
              />
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Defensive Shield</h4>
              <ExcitingBidButton
                amount={2000}
                variant="defensive"
                onClick={testBidVariants}
              />
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Victory Conquest</h4>
              <ExcitingBidButton
                amount={2500}
                variant="victory"
                onClick={testBidVariants}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Optimized Components */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Mobile Optimized Components
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MobileCard>
              <h4 className="text-white font-medium mb-2">Mobile Card</h4>
              <p className="text-gray-300 text-sm">
                Touch-friendly card with backdrop blur and hover effects
              </p>
            </MobileCard>
            
            <div className="space-y-2">
              <MobileButton variant="default" className="w-full">
                Primary Action
              </MobileButton>
              <MobileButton variant="secondary" className="w-full">
                Secondary Action
              </MobileButton>
              <MobileButton className="w-full">
                Default Action
              </MobileButton>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-2">Touch Optimized</h4>
              <p className="text-white/90 text-sm">
                All buttons have active:scale-95 and touch-manipulation for better mobile experience
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Military Terminology */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sword className="h-5 w-5" />
            Military Gaming Terminology
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-white font-medium">Countdown Status:</h4>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• <span className="text-green-400">DEPLOYMENT</span> - Days remaining</li>
                <li>• <span className="text-blue-400">MISSION ACTIVE</span> - Hours remaining</li>
                <li>• <span className="text-yellow-400">ENGAGEMENT</span> - Minutes remaining</li>
                <li>• <span className="text-orange-400">FINAL STRIKE</span> - Last 5 minutes</li>
                <li>• <span className="text-red-400">CRITICAL</span> - Last minute</li>
                <li>• <span className="text-red-600">NUCLEAR</span> - Last 30 seconds</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-white font-medium">Bid Actions:</h4>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• <span className="text-orange-400">ENGAGE</span> - Place bid</li>
                <li>• <span className="text-red-400">STRIKE</span> - Aggressive bid</li>
                <li>• <span className="text-blue-400">DEFEND</span> - Defensive bid</li>
                <li>• <span className="text-purple-400">CONQUER</span> - Victory bid</li>
                <li>• <span className="text-yellow-400">DOMINATE</span> - Winning bid</li>
                <li>• <span className="text-gray-400">DEPLOYING...</span> - Loading state</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={testNotifications}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              Test Notifications
            </Button>
            
            <Button 
              onClick={() => {
                addNotification({
                  type: 'error',
                  title: 'MISSION FAILED',
                  message: 'Your bid was outmaneuvered by the enemy!',
                  duration: 4000
                })
              }}
              className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
            >
              Test Error
            </Button>
            
            <Button 
              onClick={() => {
                addNotification({
                  type: 'warning',
                  title: 'ENEMY APPROACHING',
                  message: 'Multiple bidders detected in the area!',
                  duration: 4000
                })
              }}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
            >
              Test Warning
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Notifications */}
      {notifications.map((notification) => (
        <MilitaryNotification
          key={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

      {/* Feature Summary */}
      <Card className="bg-gradient-to-r from-green-900 to-blue-900 border-green-500/50">
        <CardHeader>
          <CardTitle className="text-white text-center">
            ✅ MILITARY GAMING FEATURES IMPLEMENTED
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="text-green-400 font-medium">Real-Time Effects:</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Dynamic countdown animations</li>
                <li>• Pulse intensity scaling</li>
                <li>• Progress bars for critical time</li>
                <li>• Military status indicators</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-blue-400 font-medium">Mobile Optimization:</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Touch-friendly interactions</li>
                <li>• Responsive navigation</li>
                <li>• Mobile-optimized cards</li>
                <li>• Bottom navigation bar</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
