'use client'

import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestShippingFixPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [testAddress, setTestAddress] = useState({
    name: 'Test User',
    street: '123 Test Street',
    city: 'Test City',
    state: 'CA',
    zip: '12345',
    country: 'US'
  })

  const loadItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabaseClient
        .from('v_barracks_items')
        .select('*')
        .eq('user_id', 'user_ojPhs9dIhFQ9C')
        .limit(5)

      if (error) {
        console.error('Error loading items:', error)
        return
      }

      console.log('Loaded items:', data)
      setItems(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveAddress = async (itemId: string) => {
    try {
      console.log('Saving address for item:', itemId)
      console.log('Address data:', testAddress)

      const { data, error } = await supabaseClient
        .from('barracks_items')
        .update({
          shipping_address: testAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()

      if (error) {
        console.error('Error saving address:', error)
        return
      }

      console.log('Address saved successfully:', data)
      
      // Reload items to see the updated data
      await loadItems()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Shipping Address Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Address</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(testAddress, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Barracks Items</h2>
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>ID:</strong> {item.id}</p>
                <p><strong>Type:</strong> {item.auction_type}</p>
                <p><strong>Status:</strong> {item.barracks_status}</p>
                <p><strong>Shipping Address:</strong></p>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {item.shipping_address ? JSON.stringify(item.shipping_address, null, 2) : 'None'}
                </pre>
                {item.auction_type === 'PHYSICAL' && (
                  <Button onClick={() => saveAddress(item.id)}>
                    Save Test Address
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
