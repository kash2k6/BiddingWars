"use client"

import { useState } from "react"
import { Download, Tag, Link, FileText, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface DigitalProductDeliveryProps {
  auction: {
    id: string
    type: 'DIGITAL' | 'PHYSICAL'
    digital_delivery_type?: 'FILE' | 'DISCOUNT_CODE' | 'DOWNLOAD_LINK'
    digital_file_path?: string
    digital_discount_code?: string
    digital_download_link?: string
    digital_instructions?: string
  }
  isWinner: boolean
}

export function DigitalProductDelivery({ auction, isWinner }: DigitalProductDeliveryProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState<string | null>(null)

  if (auction.type !== 'DIGITAL' || !isWinner) {
    return null
  }

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard.`,
      })
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy manually.",
        variant: "destructive",
      })
    }
  }

  const handleDownload = async () => {
    if (!auction.digital_file_path) return

    try {
      const response = await fetch(`/api/download-digital-file?filePath=${encodeURIComponent(auction.digital_file_path)}`)
      
      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = auction.digital_file_path.split('/').pop() || 'digital-product'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download started!",
        description: "Your digital product is downloading.",
      })
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="border rounded-lg p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <h3 className="text-lg font-semibold text-green-900">🎉 Digital Product Delivered!</h3>
      </div>

      <div className="space-y-4">
        {/* File Download */}
        {auction.digital_delivery_type === 'FILE' && auction.digital_file_path && (
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Digital File</p>
                  <p className="text-sm text-gray-600">
                    {auction.digital_file_path.split('/').pop()}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDownload}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}

        {/* Discount Code */}
        {auction.digital_delivery_type === 'DISCOUNT_CODE' && auction.digital_discount_code && (
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Discount Code</p>
                  <p className="text-sm text-gray-600">Use this code for your discount</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-lg px-3 py-1">
                  {auction.digital_discount_code}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(auction.digital_discount_code!, 'Discount code')}
                >
                  {copied === 'discount' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Download Link */}
        {auction.digital_delivery_type === 'DOWNLOAD_LINK' && auction.digital_download_link && (
          <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Download Link</p>
                  <p className="text-sm text-gray-600">Access your digital product</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(auction.digital_download_link, '_blank')}
                >
                  <Link className="h-4 w-4 mr-2" />
                  Open Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(auction.digital_download_link!, 'Download link')}
                >
                  {copied === 'link' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {auction.digital_instructions && (
          <div className="border rounded-lg p-4 bg-white">
            <h4 className="font-medium text-gray-900 mb-2">📝 Instructions</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {auction.digital_instructions}
            </p>
          </div>
        )}

        {/* Success Message */}
        <div className="text-center p-4 bg-green-100 rounded-lg">
          <p className="text-green-800 font-medium">
            ✅ Your digital product has been automatically delivered!
          </p>
          <p className="text-sm text-green-700 mt-1">
            No shipping required - enjoy your purchase immediately!
          </p>
        </div>
      </div>
    </div>
  )
}
