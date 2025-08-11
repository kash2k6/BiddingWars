"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/payouts"
import { calculatePayouts } from "@/lib/payouts"
import { Package, Upload, Calendar, DollarSign, Percent } from "lucide-react"
import { DigitalProductUpload, DigitalProductData } from "@/components/DigitalProductUpload"
import { ImageUpload } from "@/components/ImageUpload"

interface CreateListingForm {
  title: string
  description: string
  type: 'DIGITAL' | 'PHYSICAL'
  startPriceCents: number
  minIncrementCents: number
  buyNowPriceCents?: number
  communityPct: number
  shippingCostCents: number
  startsAt: string
  endsAt: string
  images: string[]
  digitalProduct?: DigitalProductData
}

export default function CreateListingPage({ params }: { params: { experienceId: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingAuctionId, setEditingAuctionId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateListingForm>({
    title: '',
    description: '',
    type: 'DIGITAL',
    startPriceCents: 1000, // $10.00
    minIncrementCents: 100, // $1.00
    buyNowPriceCents: undefined,
    communityPct: 5, // 5% default
    shippingCostCents: 0,
    startsAt: new Date().toISOString().slice(0, 16), // Start immediately
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 7 days from now
    images: [],
    digitalProduct: {
      deliveryType: 'FILE',
    },
  })

                const handleSubmit = async (e: React.FormEvent) => {
                e.preventDefault()
                setLoading(true)

                try {
                  // Get the current Whop context
                  const contextResponse = await fetch('/api/whop-context')
                  if (!contextResponse.ok) {
                    throw new Error('Failed to get user context')
                  }
                  const context = await contextResponse.json()

                  const endpoint = isEditing ? `/api/auctions/${editingAuctionId}` : '/api/auctions'
                  const method = isEditing ? 'PUT' : 'POST'

                  const response = await fetch(endpoint, {
                    method,
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      ...form,
                      userId: context.userId,
                      experienceId: context.experienceId,
                      companyId: context.companyId,
                    }),
                  })

                  const result = await response.json()

                  if (!response.ok) {
                    throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'create'} auction`)
                  }

                  toast({
                    title: isEditing ? "Auction Updated!" : "Auction Created!",
                    description: `Your auction has been ${isEditing ? 'updated' : 'created'} successfully.`,
                  })

                  router.push(`/experiences/${params.experienceId}`)
                } catch (error) {
                  console.error(`Error ${isEditing ? 'updating' : 'creating'} auction:`, error)
                  toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} auction`,
                    variant: "destructive",
                  })
                } finally {
                  setLoading(false)
                }
              }

                const handleInputChange = (field: keyof CreateListingForm, value: any) => {
                setForm(prev => ({ ...prev, [field]: value }))
              }

              // Load auction data for editing
              useEffect(() => {
                const editId = searchParams.get('edit')
                if (editId) {
                  setIsEditing(true)
                  setEditingAuctionId(editId)
                  loadAuctionData(editId)
                }
              }, [searchParams])

              const loadAuctionData = async (auctionId: string) => {
                try {
                  setLoading(true)
                  
                  // Get the current Whop context
                  const contextResponse = await fetch('/api/whop-context')
                  if (!contextResponse.ok) {
                    throw new Error('Failed to get user context')
                  }
                  const context = await contextResponse.json()

                  // Fetch auction data
                  const response = await fetch(`/api/auctions/${auctionId}?userId=${encodeURIComponent(context.userId)}&experienceId=${encodeURIComponent(context.experienceId)}`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  })

                  if (!response.ok) {
                    throw new Error('Failed to load auction data')
                  }

                  const auction = await response.json()
                  
                  // Populate form with auction data
                  setForm({
                    title: auction.title,
                    description: auction.description,
                    type: auction.type,
                    startPriceCents: auction.start_price_cents,
                    minIncrementCents: auction.min_increment_cents,
                    buyNowPriceCents: auction.buy_now_price_cents,
                    communityPct: auction.community_pct,
                    shippingCostCents: auction.shipping_cost_cents,
                    startsAt: new Date(auction.starts_at).toISOString().slice(0, 16),
                    endsAt: new Date(auction.ends_at).toISOString().slice(0, 16),
                    images: auction.images || [],
                    digitalProduct: {
                      deliveryType: auction.digital_delivery_type || 'FILE',
                      filePath: auction.digital_file_path,
                      discountCode: auction.digital_discount_code,
                      downloadLink: auction.digital_download_link,
                      instructions: auction.digital_instructions,
                    },
                  })

                  toast({
                    title: "Auction Loaded!",
                    description: "Ready to edit your auction.",
                  })
                } catch (error) {
                  console.error('Error loading auction:', error)
                  toast({
                    title: "Error",
                    description: "Failed to load auction data",
                    variant: "destructive",
                  })
                  // Redirect back to auctions page if loading fails
                  router.push(`/experiences/${params.experienceId}/auctions`)
                } finally {
                  setLoading(false)
                }
              }

  // Calculate fee breakdown
  const totalAmount = form.startPriceCents
  const payouts = calculatePayouts(totalAmount, 3, form.communityPct)

                if (loading) {
                return (
                  <div className="flex items-center justify-center min-h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
                      <p className="text-lg text-white">
                        {isEditing ? 'Loading auction data...' : 'Preparing mission...'}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        {isEditing ? '⚔️ Loading your war zone data...' : '🚀 Preparing deployment...'}
                      </p>
                    </div>
                  </div>
                )
              }

              return (
                <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">
                        {isEditing ? '⚔️ EDIT WAR ZONE ⚔️' : '🚀 DEPLOY NEW MISSION 🚀'}
                      </h2>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                        <span className="text-sm text-purple-600 font-semibold">{isEditing ? 'EDITING' : 'DEPLOYING'}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold">
                      {form.type} WEAPON
                    </Badge>
                  </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Enter auction title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md h-32"
                    placeholder="Describe your item..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Item Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="DIGITAL">Digital</option>
                    <option value="PHYSICAL">Physical</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Starting Price ($)</label>
                  <input
                    type="number"
                    value={form.startPriceCents / 100}
                    onChange={(e) => handleInputChange('startPriceCents', Math.round(parseFloat(e.target.value) * 100))}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Bid Increment ($)</label>
                  <input
                    type="number"
                    value={form.minIncrementCents / 100}
                    onChange={(e) => handleInputChange('minIncrementCents', Math.round(parseFloat(e.target.value) * 100))}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Buy Now Price ($) - Optional</label>
                  <input
                    type="number"
                    value={form.buyNowPriceCents ? form.buyNowPriceCents / 100 : ''}
                    onChange={(e) => handleInputChange('buyNowPriceCents', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined)}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0.01"
                    step="0.01"
                    placeholder="Leave empty for no buy now option"
                  />
                </div>

                {form.type === 'PHYSICAL' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Shipping Cost ($)</label>
                    <input
                      type="number"
                      value={form.shippingCostCents / 100}
                      onChange={(e) => handleInputChange('shippingCostCents', Math.round(parseFloat(e.target.value) * 100))}
                      className="w-full px-3 py-2 border rounded-md"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => handleInputChange('startsAt', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => handleInputChange('endsAt', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview & Fees */}
          <div className="space-y-6">
            {/* Fee Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Fee Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Sale Price:</span>
                  <span className="font-medium">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Platform Fee (3%):</span>
                  <span>-{formatCurrency(payouts.platformFee)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Community Fee ({form.communityPct}%):</span>
                  <span>-{formatCurrency(payouts.communityFee)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold">
                    <span>You Receive:</span>
                    <span className="text-green-600">{formatCurrency(payouts.sellerAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Community Fee Setting */}
            <Card>
              <CardHeader>
                <CardTitle>Community Fee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Community Percentage (%)</label>
                  <input
                    type="number"
                    value={form.communityPct}
                    onChange={(e) => handleInputChange('communityPct', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  This percentage goes to the community owner. Higher percentages may attract more community support.
                </p>
              </CardContent>
            </Card>

            {/* Digital Product Upload - Only show for digital auctions */}
            {/* Digital Product Upload - Only show for digital auctions */}
            {form.type === 'DIGITAL' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Digital Product Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DigitalProductUpload
                    value={form.digitalProduct || { deliveryType: 'FILE' }}
                    onChange={(digitalProduct) => setForm({ ...form, digitalProduct })}
                    disabled={loading}
                  />
                </CardContent>
              </Card>
            )}

            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Auction Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  images={form.images}
                  onChange={(images) => setForm({ ...form, images })}
                  disabled={loading}
                  maxImages={5}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
                                <Button
                        type="submit"
                        disabled={loading}
                        className="min-w-32 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold"
                      >
                        {loading ? (isEditing ? 'Updating...' : 'Deploying...') : (isEditing ? 'Update Mission' : 'Deploy Mission')}
                      </Button>
        </div>
      </form>
    </div>
  )
}
