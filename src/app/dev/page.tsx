'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, TestTube, Zap, Users, DollarSign } from 'lucide-react'

export default function DevPage() {
  const [selectedExperience, setSelectedExperience] = useState('exp_hxtkjfMPOH3rWW')

  const handleEnterExperience = () => {
    window.location.href = `/experiences/${selectedExperience}`
  }

  const testFeatures = [
    {
      title: "🧪 Test Notifications",
      description: "Test Whop push notifications",
      href: "/test-notification",
      icon: Zap
    },
    {
      title: "🔧 Test Admin",
      description: "Test admin permissions",
      href: "/test-admin",
      icon: Users
    },
    {
      title: "💳 Test Payment",
      description: "Test payment system",
      href: "/test-payment",
      icon: DollarSign
    },
    {
      title: "🎮 Military Features",
      description: "Test gamified UI components",
      href: "/test-military-features",
      icon: TestTube
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">⚔️</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              BIDDING WARS
            </h1>
          </div>
          <p className="text-xl text-gray-300 mb-2">Development Testing Portal</p>
          <p className="text-gray-400">Test the app without Whop iframe context</p>
        </div>

        {/* Experience Selection */}
        <Card className="mb-8 bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Select Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Experience ID
                </label>
                <input
                  type="text"
                  value={selectedExperience}
                  onChange={(e) => setSelectedExperience(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter experience ID"
                />
              </div>
              <Button 
                onClick={handleEnterExperience}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Enter Experience
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testFeatures.map((feature) => (
            <Card 
              key={feature.href}
              className="bg-gradient-to-br from-slate-800/80 to-purple-800/80 backdrop-blur-sm border border-purple-500/30 hover:border-purple-400/50 transition-all duration-200 cursor-pointer"
              onClick={() => window.location.href = feature.href}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3">
                      {feature.description}
                    </p>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      Test Feature
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            This development portal allows you to test the app without requiring Whop iframe context.
          </p>
          <p className="text-xs text-gray-600 mt-2">
            In production, users will access this through their Whop experience.
          </p>
        </div>
      </div>
    </div>
  )
}
