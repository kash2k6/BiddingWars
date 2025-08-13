"use client"

import { useState } from 'react'
import { Countdown } from '@/components/Countdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TestAntiSnipePage() {
  const [endTime, setEndTime] = useState(() => {
    // Set end time to 2 minutes from now
    const now = new Date()
    now.setMinutes(now.getMinutes() + 2)
    return now.toISOString()
  })
  
  const [antiSnipeSec, setAntiSnipeSec] = useState(120) // 2 minutes default
  const [auctionStatus, setAuctionStatus] = useState('LIVE')

  const resetTimer = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 2)
    setEndTime(now.toISOString())
    setAuctionStatus('LIVE')
  }

  const endAuction = () => {
    setAuctionStatus('ENDED')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Anti-Snipe System Test</h1>
        <p className="text-gray-400">Test the anti-snipe countdown functionality</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Countdown Display */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Live Countdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Countdown 
                endTime={endTime}
                playSound={true}
                auctionStatus={auctionStatus}
                antiSnipeSec={antiSnipeSec}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Anti-Snipe Window (seconds)</Label>
              <Input
                type="number"
                value={antiSnipeSec}
                onChange={(e) => setAntiSnipeSec(parseInt(e.target.value) || 120)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={resetTimer} className="flex-1">
                Reset Timer (2 min)
              </Button>
              <Button onClick={endAuction} variant="destructive" className="flex-1">
                End Auction
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">How Anti-Snipe Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-bold text-white mb-2">🛡️ Anti-Snipe Protection</h3>
              <ul className="space-y-2 text-sm">
                <li>• When auction has {antiSnipeSec} seconds or less remaining</li>
                <li>• Any bid placed extends the auction by {antiSnipeSec} seconds</li>
                <li>• Prevents last-second sniping</li>
                <li>• Gives all bidders fair chance to respond</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">⚡ Visual Indicators</h3>
              <ul className="space-y-2 text-sm">
                <li>• Yellow warning box appears during anti-snipe window</li>
                <li>• Shows remaining seconds in anti-snipe mode</li>
                <li>• Clear message: "Auction extends if bid placed"</li>
                <li>• Zap icon indicates active protection</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white mb-2">🎯 User Experience</h3>
              <ul className="space-y-2 text-sm">
                <li>• Users know when anti-snipe is active</li>
                <li>• Encourages fair bidding behavior</li>
                <li>• Prevents frustration from last-second losses</li>
                <li>• Creates more engaging auction experience</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Settings */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Current Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">End Time:</span>
              <span className="text-white ml-2">{new Date(endTime).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">Anti-Snipe Window:</span>
              <span className="text-white ml-2">{antiSnipeSec} seconds</span>
            </div>
            <div>
              <span className="text-gray-400">Auction Status:</span>
              <span className="text-white ml-2">{auctionStatus}</span>
            </div>
            <div>
              <span className="text-gray-400">Time Until Anti-Snipe:</span>
              <span className="text-white ml-2">
                {Math.max(0, Math.ceil((new Date(endTime).getTime() - new Date().getTime() - (antiSnipeSec * 1000)) / 1000))}s
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
