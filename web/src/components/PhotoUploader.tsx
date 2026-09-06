import { useRef } from 'react'
import type { MediaAsset } from '../types/memorial'

interface PhotoUploaderProps {
  photos: MediaAsset[]
  /** Receives a snapshot of selected files (not a live FileList). */
  onUpload: (files: File[]) => void | Promise<void>
  onDelete: (mediaId: string) => void
  disabled?: boolean
}

export function PhotoUploader({
  photos,
  onUpload,
  onDelete,
  disabled,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="photo-uploader">
      <div className="photo-grid">
        {photos.map((photo) => (
          <div key={photo.id} className="photo-thumb">
            <img src={photo.publicUrl} alt="" />
            {!disabled && (
              <button
                type="button"
                className="photo-remove"
                onClick={() => onDelete(photo.id)}
                aria-label="Remove photo"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            type="button"
            className="photo-add"
            onClick={() => inputRef.current?.click()}
          >
            <span>+</span>
            <span className="photo-add-label">Add photos</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const input = e.target
          const selected = input.files ? Array.from(input.files) : []
          input.value = ''
          if (selected.length > 0) void onUpload(selected)
        }}
      />
      {photos.length === 0 && (
        <p className="photo-hint">At least one photo is required.</p>
      )}
    </div>
  )
}
