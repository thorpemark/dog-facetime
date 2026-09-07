import { useCallback, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CallTargetKind, Memorial } from '../types/memorial'
import type { FocalPoint } from '../utils/focalPoint'
import { useAuth } from '../context/AuthContext'
import { addPendingClaim } from '../lib/pendingMemorials'
import {
  createMemorial,
  deletePhoto,
  updateMediaFocalPoint,
  upsertCallTarget,
  uploadPhoto,
} from '../services/memorialService'
import { editUrl, shareUrl } from '../lib/urls'
import { CopyLinkButton } from './CopyLinkButton'
import { DemoModeBanner } from './DemoModeBanner'
import { PhotoUploader } from './PhotoUploader'
import { SignInPanel } from './SignInPanel'

type Step = 'title' | 'dog_a' | 'dog_b_choice' | 'dog_b' | 'together_choice' | 'together' | 'done'

interface DraftPhoto {
  id: string
  publicUrl: string
  storagePath?: string
  previewUrl?: string
  focalX?: number
  focalY?: number
}

interface TargetDraft {
  id: string
  displayName: string
  photos: DraftPhoto[]
}

function isPendingPhotoId(id: string): boolean {
  return id.startsWith('pending-')
}

function confirmUploadedPhoto(
  prev: TargetDraft,
  tempId: string,
  targetId: string,
  asset: {
    id: string
    publicUrl: string
    storagePath?: string
    focalX?: number
    focalY?: number
  },
): TargetDraft {
  const pending = prev.photos.find((p) => p.id === tempId)
  if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl)

  const confirmed: DraftPhoto = {
    id: asset.id,
    publicUrl: asset.publicUrl,
    storagePath: asset.storagePath,
    focalX: asset.focalX,
    focalY: asset.focalY,
  }

  const withoutTemp = prev.photos.filter((p) => p.id !== tempId)
  const alreadyPresent = withoutTemp.some((p) => p.id === asset.id)
  const photos = alreadyPresent ? withoutTemp : [...withoutTemp, confirmed]

  return {
    ...prev,
    id: targetId || prev.id,
    photos,
  }
}

export function CreateMemorialView() {
  const navigate = useNavigate()
  const { user, authAvailable } = useAuth()
  const [step, setStep] = useState<Step>('title')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [memorial, setMemorial] = useState<Memorial | null>(null)
  const memorialRef = useRef<Memorial | null>(null)
  const [dogA, setDogA] = useState<TargetDraft>({ id: '', displayName: '', photos: [] })
  const [dogB, setDogB] = useState<TargetDraft>({ id: '', displayName: '', photos: [] })
  const [together, setTogether] = useState<TargetDraft>({
    id: '',
    displayName: 'Together',
    photos: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const storeMemorial = useCallback((next: Memorial) => {
    memorialRef.current = next
    setMemorial(next)
  }, [])

  const ensureMemorial = useCallback(async (): Promise<Memorial> => {
    if (memorialRef.current) return memorialRef.current
    const created = await createMemorial({ title, note })
    storeMemorial(created)
    if (!user && created.editToken && authAvailable) {
      addPendingClaim(created.id, created.editToken)
    }
    return created
  }, [authAvailable, note, storeMemorial, title, user])

  const reportError = useCallback((message: string, cause?: unknown) => {
    console.error('[CreateMemorial] upload error:', message, cause)
    setError(message)
  }, [])

  const saveTarget = async (
    kind: CallTargetKind,
    displayName: string,
    sortOrder: number,
  ): Promise<string> => {
    const m = await ensureMemorial()
    if (!m.editToken) {
      throw new Error('Memorial is missing an edit token. Refresh and try again.')
    }
    const target = await upsertCallTarget(m.editToken, kind, displayName, sortOrder)
    return target.id
  }

  const handleUpload = async (
    kind: CallTargetKind,
    displayName: string,
    sortOrder: number,
    files: File[],
    setDraft: React.Dispatch<React.SetStateAction<TargetDraft>>,
  ) => {
    if (files.length === 0) {
      reportError('No photo file was received. Please try selecting the image again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const m = await ensureMemorial()
      const editToken = m.editToken
      if (!editToken) {
        throw new Error('Memorial is not ready yet. Go back and save the memorial name first.')
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const tempId = `pending-${crypto.randomUUID()}`
        const previewUrl = URL.createObjectURL(file)

        let mediaSortOrder = 0
        setDraft((prev) => {
          mediaSortOrder = prev.photos.filter((p) => !isPendingPhotoId(p.id)).length
          return {
            ...prev,
            photos: [
              ...prev.photos,
              { id: tempId, publicUrl: previewUrl, previewUrl },
            ],
          }
        })

        const { asset, targetId } = await uploadPhoto(
          editToken,
          { kind, displayName, sortOrder },
          file,
          mediaSortOrder + i,
        )

        setDraft((prev) => confirmUploadedPhoto(prev, tempId, targetId, asset))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      reportError(message, err)
      setDraft((prev) => {
        for (const photo of prev.photos) {
          if (isPendingPhotoId(photo.id) && photo.previewUrl) {
            URL.revokeObjectURL(photo.previewUrl)
          }
        }
        return {
          ...prev,
          photos: prev.photos.filter((photo) => !isPendingPhotoId(photo.id)),
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePhoto = async (
    mediaId: string,
    setDraft: React.Dispatch<React.SetStateAction<TargetDraft>>,
  ) => {
    setLoading(true)
    setError(null)
    try {
      const m = await ensureMemorial()
      if (!m.editToken) {
        throw new Error('Memorial is not ready yet.')
      }

      let storagePath: string | undefined
      setDraft((prev) => {
        storagePath = prev.photos.find((p) => p.id === mediaId)?.storagePath
        return prev
      })

      if (!isPendingPhotoId(mediaId)) {
        await deletePhoto(m.editToken, mediaId, storagePath)
      }

      setDraft((prev) => {
        const removed = prev.photos.find((p) => p.id === mediaId)
        if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
        return {
          ...prev,
          photos: prev.photos.filter((p) => p.id !== mediaId),
        }
      })
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Delete failed', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFocalChange = async (
    mediaId: string,
    focal: FocalPoint,
    setDraft: React.Dispatch<React.SetStateAction<TargetDraft>>,
  ) => {
    setLoading(true)
    setError(null)
    try {
      const m = await ensureMemorial()
      if (!m.editToken) {
        throw new Error('Memorial is not ready yet.')
      }
      const updated = await updateMediaFocalPoint(m.editToken, mediaId, focal)
      setDraft((prev) => ({
        ...prev,
        photos: prev.photos.map((photo) =>
          photo.id === mediaId
            ? {
                ...photo,
                focalX: updated.focalX,
                focalY: updated.focalY,
              }
            : photo,
        ),
      }))
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Failed to save focus', err)
    } finally {
      setLoading(false)
    }
  }

  const startDogA = async () => {
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      await ensureMemorial()
      const targetId = await saveTarget('dog_a', 'Dog', 0)
      setDogA({ id: targetId, displayName: 'Dog', photos: [] })
      setStep('dog_a')
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Failed to create memorial', err)
    } finally {
      setLoading(false)
    }
  }

  const continueFromDogA = async () => {
    const confirmedPhotos = dogA.photos.filter((p) => !isPendingPhotoId(p.id))
    if (confirmedPhotos.length === 0) {
      setError('Please add at least one photo.')
      return
    }
    const name = dogA.displayName.trim() || 'Dog'
    setLoading(true)
    try {
      await saveTarget('dog_a', name, 0)
      setStep('dog_b_choice')
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Failed to save', err)
    } finally {
      setLoading(false)
    }
  }

  const startDogB = async () => {
    setLoading(true)
    try {
      const targetId = await saveTarget('dog_b', 'Dog 2', 1)
      setDogB({ id: targetId, displayName: 'Dog 2', photos: [] })
      setStep('dog_b')
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Failed', err)
    } finally {
      setLoading(false)
    }
  }

  const continueFromDogB = async () => {
    const confirmedPhotos = dogB.photos.filter((p) => !isPendingPhotoId(p.id))
    if (confirmedPhotos.length === 0) {
      setError('Please add at least one photo.')
      return
    }
    setLoading(true)
    try {
      await saveTarget('dog_b', dogB.displayName.trim() || 'Dog 2', 1)
      setStep('together_choice')
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Failed', err)
    } finally {
      setLoading(false)
    }
  }

  const startTogether = async () => {
    setLoading(true)
    try {
      const targetId = await saveTarget('together', 'Together', 2)
      setTogether({ id: targetId, displayName: 'Together', photos: [] })
      setStep('together')
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Failed', err)
    } finally {
      setLoading(false)
    }
  }

  const finishTogether = async () => {
    const confirmedPhotos = together.photos.filter((p) => !isPendingPhotoId(p.id))
    if (confirmedPhotos.length === 0) {
      setError('Please add at least one photo.')
      return
    }
    setLoading(true)
    try {
      await saveTarget('together', together.displayName.trim() || 'Together', 2)
      setStep('done')
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Failed', err)
    } finally {
      setLoading(false)
    }
  }

  const skipToDone = () => setStep('done')

  const confirmedPhotoCount = (draft: TargetDraft) =>
    draft.photos.filter((p) => !isPendingPhotoId(p.id)).length

  return (
    <div className="screen form-screen">
      <DemoModeBanner />
      <div className="form-content">
        <header className="form-header">
          <button type="button" className="btn-text back-btn" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h1>Create Memorial</h1>
        </header>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {step === 'title' && (
          <div className="form-step">
            <label>
              Memorial name
              <input
                type="text"
                placeholder="e.g. Biscuit &amp; Buddy"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </label>
            <label>
              Optional note
              <textarea
                placeholder="A short message for family…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </label>
            <button
              type="button"
              className="btn-call"
              disabled={!title.trim() || loading}
              onClick={startDogA}
            >
              Continue
            </button>
          </div>
        )}

        {step === 'dog_a' && (
          <div className="form-step">
            <h2>First dog</h2>
            <label>
              Name
              <input
                type="text"
                value={dogA.displayName}
                onChange={(e) =>
                  setDogA((prev) => ({ ...prev, displayName: e.target.value }))
                }
              />
            </label>
            <PhotoUploader
              photos={dogA.photos.map((p) => ({
                id: p.id,
                publicUrl: p.publicUrl,
                storagePath: p.storagePath ?? '',
                reactionTag: null,
                sortOrder: 0,
                focalX: p.focalX ?? 0.5,
                focalY: p.focalY ?? 0.5,
              }))}
              onUpload={(files) =>
                handleUpload('dog_a', dogA.displayName.trim() || 'Dog', 0, files, setDogA)
              }
              onDelete={(mediaId) => handleDeletePhoto(mediaId, setDogA)}
              onFocalChange={(mediaId, focal) =>
                handleFocalChange(mediaId, focal, setDogA)
              }
              disabled={loading}
            />
            <button
              type="button"
              className="btn-call"
              disabled={loading || confirmedPhotoCount(dogA) === 0}
              onClick={continueFromDogA}
            >
              Continue
            </button>
          </div>
        )}

        {step === 'dog_b_choice' && (
          <div className="form-step choice-step">
            <h2>Add a second dog?</h2>
            <p>Optional — family can call each dog separately or together.</p>
            <button type="button" className="btn-call" onClick={startDogB} disabled={loading}>
              Yes, add Dog 2
            </button>
            <button type="button" className="btn-text" onClick={() => setStep('together_choice')}>
              Skip
            </button>
          </div>
        )}

        {step === 'dog_b' && (
          <div className="form-step">
            <h2>Second dog</h2>
            <label>
              Name
              <input
                type="text"
                value={dogB.displayName}
                onChange={(e) =>
                  setDogB((prev) => ({ ...prev, displayName: e.target.value }))
                }
              />
            </label>
            <PhotoUploader
              photos={dogB.photos.map((p) => ({
                id: p.id,
                publicUrl: p.publicUrl,
                storagePath: p.storagePath ?? '',
                reactionTag: null,
                sortOrder: 0,
                focalX: p.focalX ?? 0.5,
                focalY: p.focalY ?? 0.5,
              }))}
              onUpload={(files) =>
                handleUpload('dog_b', dogB.displayName.trim() || 'Dog 2', 1, files, setDogB)
              }
              onDelete={(mediaId) => handleDeletePhoto(mediaId, setDogB)}
              onFocalChange={(mediaId, focal) =>
                handleFocalChange(mediaId, focal, setDogB)
              }
              disabled={loading}
            />
            <button
              type="button"
              className="btn-call"
              disabled={loading || confirmedPhotoCount(dogB) === 0}
              onClick={continueFromDogB}
            >
              Continue
            </button>
          </div>
        )}

        {step === 'together_choice' && (
          <div className="form-step choice-step">
            <h2>Add together photos?</h2>
            <p>Optional — photos of both dogs for a shared call.</p>
            <button type="button" className="btn-call" onClick={startTogether} disabled={loading}>
              Yes, add together photos
            </button>
            <button type="button" className="btn-text" onClick={skipToDone}>
              Skip — finish
            </button>
          </div>
        )}

        {step === 'together' && (
          <div className="form-step">
            <h2>Together</h2>
            <PhotoUploader
              photos={together.photos.map((p) => ({
                id: p.id,
                publicUrl: p.publicUrl,
                storagePath: p.storagePath ?? '',
                reactionTag: null,
                sortOrder: 0,
                focalX: p.focalX ?? 0.5,
                focalY: p.focalY ?? 0.5,
              }))}
              onUpload={(files) =>
                handleUpload(
                  'together',
                  together.displayName.trim() || 'Together',
                  2,
                  files,
                  setTogether,
                )
              }
              onDelete={(mediaId) => handleDeletePhoto(mediaId, setTogether)}
              onFocalChange={(mediaId, focal) =>
                handleFocalChange(mediaId, focal, setTogether)
              }
              disabled={loading}
            />
            <button
              type="button"
              className="btn-call"
              disabled={loading || confirmedPhotoCount(together) === 0}
              onClick={finishTogether}
            >
              Finish
            </button>
          </div>
        )}

        {step === 'done' && memorial && (
          <div className="form-step done-step">
            <span className="paw-icon large">🐾</span>
            <h2>Your memorial is ready</h2>
            {user ? (
              <p className="saved-to-account">Saved to your account — find it anytime under My memorials.</p>
            ) : authAvailable ? (
              <div className="save-account-cta">
                <p className="save-account-lead">
                  <strong>Save this memorial to your account</strong> so you can recover your share and edit links later.
                </p>
                <SignInPanel compact />
              </div>
            ) : (
              <p>Share the link with family — they can call without signing in.</p>
            )}
            {user && (
              <p className="done-hint">Share the link with family — they can call without signing in.</p>
            )}

            <div className="link-actions">
              <CopyLinkButton label="Copy share link" url={shareUrl(memorial.shareId)} />
              <CopyLinkButton
                label="Copy edit link"
                url={editUrl(memorial.editToken!)}
                className="btn-text link-btn"
              />
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(`/m/${memorial.shareId}`)}
            >
              Preview memorial
            </button>
            <button
              type="button"
              className="btn-text"
              onClick={() => navigate(`/edit/${memorial.editToken}`)}
            >
              Edit photos &amp; names
            </button>
            {user && (
              <Link to="/my" className="btn-text">View in My memorials</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
