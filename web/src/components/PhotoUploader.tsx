import { useRef, useState } from 'react'
import type { MediaAsset } from '../types/memorial'
import {
  hasCustomDualFraming,
  type DualFraming,
} from '../utils/focalPoint'
import {
  dualFramingFromMediaAsset,
} from '../services/memorialService'
import { PhotoFocalEditor } from './PhotoFocalEditor'

interface PhotoUploaderProps {
  photos: MediaAsset[]
  /** Receives a snapshot of selected files (not a live FileList). */
  onUpload: (files: File[]) => void | Promise<void>
  onDelete: (mediaId: string) => void
  onFocalChange?: (mediaId: string, framing: DualFraming) => void | Promise<void>
  disabled?: boolean
  /** Wider default framing for together / group shots. */
  preferWideFrame?: boolean
}

function hasCustomFraming(photo: MediaAsset): boolean {
  const framing = dualFramingFromMediaAsset(photo, undefined, false)
  return hasCustomDualFraming(framing, 1, false)
}

export function PhotoUploader({
  photos,
  onUpload,
  onDelete,
  onFocalChange,
  disabled,
  preferWideFrame = false,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editingPhoto, setEditingPhoto] = useState<MediaAsset | null>(null)
  const [savingFocal, setSavingFocal] = useState(false)

  const handleSaveFocal = async (framing: DualFraming) => {
    if (!editingPhoto || !onFocalChange) return
    setSavingFocal(true)
    try {
      await onFocalChange(editingPhoto.id, framing)
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
                hasCustomFraming(photo)
                  ? 'Edit call crop (custom)'
                  : 'Set call crop'
              }
            >
              <img src={photo.publicUrl} alt="" />
              {onFocalChange && !photo.id.startsWith('pending-') && (
                <span
                  className={`photo-focus-badge ${hasCustomFraming(photo) ? 'custom' : ''}`}
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
          {preferWideFrame
            ? 'Tap a photo to set portrait and landscape/PC crops for calls.'
            : 'Tap a photo to set portrait and landscape/PC call crops.'}
        </p>
      )}

      {editingPhoto && onFocalChange && (
        <PhotoFocalEditor
          imageUrl={editingPhoto.publicUrl}
          initialFraming={dualFramingFromMediaAsset(
            editingPhoto,
            undefined,
            preferWideFrame,
          )}
          preferWideFrame={preferWideFrame}
          onSave={handleSaveFocal}
          onClose={() => setEditingPhoto(null)}
          saving={savingFocal}
        />
      )}
    </div>
  )
}
