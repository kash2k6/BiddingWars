"use client"

import { useState, useEffect } from "react"
import { Truck, Package, CheckCircle, MapPin, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabaseClient } from "@/lib/supabase-client"

interface ShippingAddress {
  name: string
  street_address: string
  city: string
  state: string
  postal_code: string
  country: string
  phone: string
}

interface Fulfillment {
  id: string
  auction_id: string
  physical_state: 'PENDING_SHIP' | 'SHIPPED' | 'DELIVERED'
  buyer_marked: boolean
  seller_marked: boolean
  shipping_address?: ShippingAddress
  tracking_number?: string
  shipping_carrier?: string
  created_at: string
  updated_at: string
}

interface PhysicalProductFulfillmentProps {
  auction: {
    id: string
    type: 'DIGITAL' | 'PHYSICAL'
    status: string
    winner_user_id?: string
    created_by_user_id: string
    experience_id: string
  }
  currentUserId: string
  experienceId: string
}

export function PhysicalProductFulfillment({ auction, currentUserId, experienceId }: PhysicalProductFulfillmentProps) {
  const { toast } = useToast()
  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null)
  const [loading, setLoading] = useState(false)
  const [addressForm, setAddressForm] = useState<ShippingAddress>({
    name: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: ''
  })
  const [trackingForm, setTrackingForm] = useState({
    tracking_number: '',
    shipping_carrier: ''
  })

  const isWinner = auction.winner_user_id === currentUserId
  const isSeller = auction.created_by_user_id === currentUserId

  useEffect(() => {
    if (auction.status === 'PAID') {
      fetchFulfillment()
    }
  }, [auction.id, auction.status])

  const fetchFulfillment = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('fulfillments')
        .select('*')
        .eq('auction_id', auction.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching fulfillment:', error)
        return
      }

      if (data) {
        setFulfillment(data)
        if (data.shipping_address) {
          setAddressForm(data.shipping_address)
        }
        if (data.tracking_number) {
          setTrackingForm({
            tracking_number: data.tracking_number,
            shipping_carrier: data.shipping_carrier || ''
          })
        }
      }
    } catch (error) {
      console.error('Error fetching fulfillment:', error)
    }
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabaseClient
        .from('fulfillments')
        .upsert({
          auction_id: auction.id,
          shipping_address: addressForm,
          physical_state: 'PENDING_SHIP'
        })

      if (error) throw error

      await fetchFulfillment()
      toast({
        title: "Address saved!",
        description: "Your shipping address has been saved.",
      })
    } catch (error) {
      console.error('Error saving address:', error)
      toast({
        title: "Error",
        description: "Failed to save shipping address.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTrackingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabaseClient
        .from('fulfillments')
        .update({
          tracking_number: trackingForm.tracking_number,
          shipping_carrier: trackingForm.shipping_carrier,
          seller_marked: true,
          physical_state: 'SHIPPED'
        })
        .eq('auction_id', auction.id)

      if (error) throw error

      await fetchFulfillment()
      toast({
        title: "Item marked as shipped!",
        description: "Tracking information has been updated.",
      })
    } catch (error) {
      console.error('Error updating tracking:', error)
      toast({
        title: "Error",
        description: "Failed to update tracking information.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkReceived = async () => {
    setLoading(true)

    try {
      const { error } = await supabaseClient
        .from('fulfillments')
        .update({
          buyer_marked: true,
          physical_state: 'DELIVERED'
        })
        .eq('auction_id', auction.id)

      if (error) throw error

      // Update auction status to FULFILLED
      await supabaseClient
        .from('auctions')
        .update({ status: 'FULFILLED' })
        .eq('id', auction.id)

      await fetchFulfillment()
      toast({
        title: "Item marked as received!",
        description: "Thank you for confirming delivery.",
      })
    } catch (error) {
      console.error('Error marking as received:', error)
      toast({
        title: "Error",
        description: "Failed to mark item as received.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTrackingUrl = (carrier: string, trackingNumber: string) => {
    const carriers: { [key: string]: string } = {
      'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
      'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      'Amazon': `https://www.amazon.com/gp/help/customer/display.html?nodeId=201910800&ref_=track_package_&trackingNumber=${trackingNumber}`
    }
    return carriers[carrier] || `https://www.google.com/search?q=${carrier}+${trackingNumber}`
  }

  if (auction.type !== 'PHYSICAL' || auction.status !== 'PAID') {
    return null
  }

  return (
    <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-blue-900">📦 Physical Product Fulfillment</h3>
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        <Badge variant={
          fulfillment?.physical_state === 'DELIVERED' ? 'default' :
          fulfillment?.physical_state === 'SHIPPED' ? 'secondary' :
          'outline'
        }>
          {fulfillment?.physical_state === 'DELIVERED' ? '✅ Delivered' :
           fulfillment?.physical_state === 'SHIPPED' ? '🚚 Shipped' :
           '📦 Pending Shipment'}
        </Badge>
      </div>

      {/* Winner: Address Collection */}
      {isWinner && !fulfillment?.shipping_address && (
        <div className="border rounded-lg p-4 bg-white mb-4">
          <h4 className="font-medium text-gray-900 mb-3">📍 Shipping Address</h4>
          <form onSubmit={handleAddressSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Full Name"
                value={addressForm.name}
                onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                required
              />
              <Input
                placeholder="Phone Number"
                value={addressForm.phone}
                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                required
              />
            </div>
            <Textarea
              placeholder="Street Address"
              value={addressForm.street_address}
              onChange={(e) => setAddressForm({ ...addressForm, street_address: e.target.value })}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="City"
                value={addressForm.city}
                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                required
              />
              <Input
                placeholder="State"
                value={addressForm.state}
                onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                required
              />
              <Input
                placeholder="ZIP Code"
                value={addressForm.postal_code}
                onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Save Shipping Address'}
            </Button>
          </form>
        </div>
      )}

      {/* Seller: Tracking Information */}
      {isSeller && fulfillment?.shipping_address && !fulfillment?.tracking_number && (
        <div className="border rounded-lg p-4 bg-white mb-4">
          <h4 className="font-medium text-gray-900 mb-3">🚚 Add Tracking Information</h4>
          <div className="mb-3 p-3 bg-gray-50 rounded">
            <h5 className="font-medium text-sm mb-2">Shipping Address:</h5>
            <p className="text-sm text-gray-700">
              {fulfillment.shipping_address.name}<br />
              {fulfillment.shipping_address.street_address}<br />
              {fulfillment.shipping_address.city}, {fulfillment.shipping_address.state} {fulfillment.shipping_address.postal_code}<br />
              {fulfillment.shipping_address.phone}
            </p>
          </div>
          <form onSubmit={handleTrackingSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Tracking Number"
                value={trackingForm.tracking_number}
                onChange={(e) => setTrackingForm({ ...trackingForm, tracking_number: e.target.value })}
                required
              />
              <Input
                placeholder="Carrier (USPS, FedEx, UPS, etc.)"
                value={trackingForm.shipping_carrier}
                onChange={(e) => setTrackingForm({ ...trackingForm, shipping_carrier: e.target.value })}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Updating...' : 'Mark as Shipped'}
            </Button>
          </form>
        </div>
      )}

      {/* Tracking Information Display */}
      {fulfillment?.tracking_number && (
        <div className="border rounded-lg p-4 bg-white mb-4">
          <h4 className="font-medium text-gray-900 mb-3">📦 Tracking Information</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Carrier:</span>
              <span className="font-medium">{fulfillment.shipping_carrier}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tracking Number:</span>
              <span className="font-mono text-sm">{fulfillment.tracking_number}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(getTrackingUrl(fulfillment.shipping_carrier!, fulfillment.tracking_number!), '_blank')}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Track Package
            </Button>
          </div>
        </div>
      )}

      {/* Winner: Mark as Received */}
      {isWinner && fulfillment?.tracking_number && !fulfillment?.buyer_marked && (
        <div className="border rounded-lg p-4 bg-white">
          <h4 className="font-medium text-gray-900 mb-3">✅ Confirm Delivery</h4>
          <p className="text-sm text-gray-600 mb-3">
            Please confirm that you have received your item in good condition.
          </p>
          <Button
            onClick={handleMarkReceived}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Confirming...' : 'Mark as Received'}
          </Button>
        </div>
      )}

      {/* Completion Status */}
      {fulfillment?.buyer_marked && (
        <div className="border rounded-lg p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-green-900">✅ Delivery Confirmed</h4>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Thank you for confirming delivery. This transaction is now complete.
          </p>
        </div>
      )}
    </div>
  )
}
