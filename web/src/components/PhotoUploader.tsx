import { useRef, useState } from 'react'
import type { MediaAsset } from '../types/memorial'
import { DEFAULT_FOCAL_X, DEFAULT_FOCAL_Y, type FocalPoint } from '../utils/focalPoint'
import { PhotoFocalEditor } from './PhotoFocalEditor'

interface PhotoUploaderProps {
  photos: MediaAsset[]
  /** Receives a snapshot of selected files (not a live FileList). */
  onUpload: (files: File[]) => void | Promise<void>
  onDelete: (mediaId: string) => void
  onFocalChange?: (mediaId: string, focal: FocalPoint) => void | Promise<void>
  disabled?: boolean
}

function hasCustomFocal(photo: MediaAsset): boolean {
  return photo.focalX !== DEFAULT_FOCAL_X || photo.focalY !== DEFAULT_FOCAL_Y
}

export function PhotoUploader({
  photos,
  onUpload,
  onDelete,
  onFocalChange,
  disabled,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editingPhoto, setEditingPhoto] = useState<MediaAsset | null>(null)
  const [savingFocal, setSavingFocal] = useState(false)

  const handleSaveFocal = async (focal: FocalPoint) => {
    if (!editingPhoto || !onFocalChange) return
    setSavingFocal(true)
    try {
      await onFocalChange(editingPhoto.id, focal)
      setEditingPhoto(null)
    } finally {
      setSavingFocal(false)
    }
  }

  return (
    <div className="photo-uploader">
      <div className="photo-grid">
        {photos.map((photo) => (
          <div key={photo.id} className="photo-thumb">
            <button
              type="button"
              className="photo-thumb-focus"
              onClick={() => onFocalChange && setEditingPhoto(photo)}
              disabled={disabled || !onFocalChange || photo.id.startsWith('pending-')}
              aria-label={
                hasCustomFocal(photo)
                  ? 'Edit focus point (custom)'
                  : 'Set focus point'
              }
            >
              <img src={photo.publicUrl} alt="" />
              {onFocalChange && !photo.id.startsWith('pending-') && (
                <span
                  className={`photo-focus-badge ${hasCustomFocal(photo) ? 'custom' : ''}`}
                  aria-hidden="true"
                >
                  ⊕
                </span>
              )}
            </button>
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
      {onFocalChange && photos.length > 0 && (
        <p className="photo-hint">
          Tap a photo to set where the face stays centered on portrait calls.
        </p>
      )}

      {editingPhoto && onFocalChange && (
        <PhotoFocalEditor
          imageUrl={editingPhoto.publicUrl}
          initialFocal={{
            focalX: editingPhoto.focalX ?? DEFAULT_FOCAL_X,
            focalY: editingPhoto.focalY ?? DEFAULT_FOCAL_Y,
          }}
          onSave={handleSaveFocal}
          onClose={() => setEditingPhoto(null)}
          saving={savingFocal}
        />
      )}
    </div>
  )
}
