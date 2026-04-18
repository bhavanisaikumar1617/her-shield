import { useState } from 'react'
import SmartImage from './SmartImage'

function FileUploadPreview({ file, setFile, label = 'Upload ID Proof' }) {
  const [preview, setPreview] = useState(null)
  const [fileName, setFileName] = useState('')

  const compressImage = async (imageFile) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Scale down if image is too large
          const maxDimension = 1200
          if (width > height) {
            if (width > maxDimension) {
              height = (height * maxDimension) / width
              width = maxDimension
            }
          } else {
            if (height > maxDimension) {
              width = (width * maxDimension) / height
              height = maxDimension
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          // Compress to JPEG with quality 0.8
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
          resolve(compressedBase64)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(imageFile)
    })
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setFileName(selectedFile.name)

    try {
      // For images, compress before encoding
      if (selectedFile.type.startsWith('image/')) {
        const compressedBase64 = await compressImage(selectedFile)
        setPreview(compressedBase64)
      }
    } catch (error) {
      console.error('File processing error:', error)
    }
  }

  const handleRemove = () => {
    setFile(null)
    setPreview(null)
    setFileName('')
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-700">{label}</label>

      {preview && (
        <div className="relative inline-block">
          <SmartImage
            src={preview}
            fallbackSrc="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=80"
            alt="Preview"
            className="max-h-32 rounded-md border border-slate-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {!file ? (
        <div className="relative">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="block w-full cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm outline-none file:mr-3 file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:cursor-pointer hover:border-slate-400 focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1 text-xs text-slate-500">Accepted formats: Images (JPG, PNG) or PDF • Max 5MB</p>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 px-3 py-2">
          <div>
            <p className="text-sm font-medium text-green-700">✓ {fileName}</p>
            <p className="text-xs text-green-600">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-sm font-medium text-green-600 hover:text-green-700"
          >
            Change
          </button>
        </div>
      )}
    </div>
  )
}

export default FileUploadPreview
