"use client"

import { useState, useCallback } from "react"
import { Upload, Link, Tag, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export type DigitalDeliveryType = 'FILE' | 'DISCOUNT_CODE' | 'DOWNLOAD_LINK'

interface DigitalProductData {
  deliveryType: DigitalDeliveryType
  file?: File
  filePath?: string
  discountCode?: string
  downloadLink?: string
  instructions?: string
}

interface DigitalProductUploadProps {
  value: DigitalProductData
  onChange: (data: DigitalProductData) => void
  disabled?: boolean
}

export function DigitalProductUpload({ value, onChange, disabled }: DigitalProductUploadProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-digital-file', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload file')
      }

      const { filePath } = await response.json()
      
      onChange({
        ...value,
        deliveryType: 'FILE',
        file,
        filePath,
      })

      toast({
        title: "File uploaded successfully!",
        description: "Your digital product is ready for delivery.",
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: "Please try again or use a different file.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }, [value, onChange, toast])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const removeFile = useCallback(() => {
    onChange({
      ...value,
      deliveryType: 'DISCOUNT_CODE',
      file: undefined,
      filePath: undefined,
    })
  }, [value, onChange])

  return (
    <div className="space-y-4">
      {/* Delivery Type Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Digital Delivery Method</label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant={value.deliveryType === 'FILE' ? 'default' : 'outline'}
            onClick={() => onChange({ ...value, deliveryType: 'FILE' })}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            File Upload
          </Button>
          <Button
            type="button"
            variant={value.deliveryType === 'DISCOUNT_CODE' ? 'default' : 'outline'}
            onClick={() => onChange({ ...value, deliveryType: 'DISCOUNT_CODE' })}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Tag className="h-4 w-4" />
            Discount Code
          </Button>
          <Button
            type="button"
            variant={value.deliveryType === 'DOWNLOAD_LINK' ? 'default' : 'outline'}
            onClick={() => onChange({ ...value, deliveryType: 'DOWNLOAD_LINK' })}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Link className="h-4 w-4" />
            Download Link
          </Button>
        </div>
      </div>

      {/* File Upload Section */}
      {value.deliveryType === 'FILE' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">Upload Digital File</label>
          
          {value.file ? (
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">{value.file.name}</p>
                    <p className="text-sm text-green-700">
                      {(value.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PDF, ZIP, MP4, etc. up to 100MB
              </p>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.zip,.rar,.mp4,.mov,.avi,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                disabled={disabled || uploading}
              />
            </div>
          )}
        </div>
      )}

      {/* Discount Code Section */}
      {value.deliveryType === 'DISCOUNT_CODE' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">Discount Code</label>
          <Input
            placeholder="Enter discount code (e.g., SAVE50)"
            value={value.discountCode || ''}
            onChange={(e) => onChange({ ...value, discountCode: e.target.value })}
            disabled={disabled}
          />
          <p className="text-xs text-gray-500">
            This code will be automatically delivered to the winner after payment.
          </p>
        </div>
      )}

      {/* Download Link Section */}
      {value.deliveryType === 'DOWNLOAD_LINK' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">Download Link</label>
          <Input
            placeholder="https://example.com/download/your-product"
            value={value.downloadLink || ''}
            onChange={(e) => onChange({ ...value, downloadLink: e.target.value })}
            disabled={disabled}
          />
          <p className="text-xs text-gray-500">
            This link will be automatically delivered to the winner after payment.
          </p>
        </div>
      )}

      {/* Instructions Section */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">Delivery Instructions (Optional)</label>
        <textarea
          placeholder="Add any special instructions for the winner..."
          value={value.instructions || ''}
          onChange={(e) => onChange({ ...value, instructions: e.target.value })}
          disabled={disabled}
          rows={3}
          className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500">
          These instructions will be shown to the winner along with their digital product.
        </p>
      </div>

      {/* Preview */}
      {value.deliveryType && (
        <div className="border rounded-lg p-3 bg-blue-50">
          <p className="text-sm font-medium text-blue-900 mb-2">Delivery Preview:</p>
          <div className="space-y-1 text-sm text-blue-800">
            {value.deliveryType === 'FILE' && value.file && (
              <p>📁 File: {value.file.name}</p>
            )}
            {value.deliveryType === 'DISCOUNT_CODE' && value.discountCode && (
              <p>🏷️ Code: {value.discountCode}</p>
            )}
            {value.deliveryType === 'DOWNLOAD_LINK' && value.downloadLink && (
              <p>🔗 Link: {value.downloadLink}</p>
            )}
            {value.instructions && (
              <p>📝 Instructions: {value.instructions}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
