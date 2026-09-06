import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { CallTargetKind, Memorial } from '../types/memorial'
import { useAuth } from '../context/AuthContext'
import { addPendingClaim } from '../lib/pendingMemorials'
import {
  createMemorial,
  upsertCallTarget,
  uploadPhoto,
} from '../services/memorialService'
import { editUrl, shareUrl } from '../lib/urls'
import { CopyLinkButton } from './CopyLinkButton'
import { DemoModeBanner } from './DemoModeBanner'
import { PhotoUploader } from './PhotoUploader'
import { SignInPanel } from './SignInPanel'

type Step = 'title' | 'dog_a' | 'dog_b_choice' | 'dog_b' | 'together_choice' | 'together' | 'done'

interface TargetDraft {
  id: string
  displayName: string
  photos: { id: string; publicUrl: string }[]
}

export function CreateMemorialView() {
  const navigate = useNavigate()
  const { user, authAvailable } = useAuth()
  const [step, setStep] = useState<Step>('title')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [memorial, setMemorial] = useState<Memorial | null>(null)
  const [dogA, setDogA] = useState<TargetDraft>({ id: '', displayName: '', photos: [] })
  const [dogB, setDogB] = useState<TargetDraft>({ id: '', displayName: '', photos: [] })
  const [together, setTogether] = useState<TargetDraft>({ id: '', displayName: 'Together', photos: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ensureMemorial = async (): Promise<Memorial> => {
    if (memorial) return memorial
    const created = await createMemorial({ title, note })
    setMemorial(created)
    if (!user && created.editToken && authAvailable) {
      addPendingClaim(created.id, created.editToken)
    }
    return created
  }

  const saveTarget = async (
    kind: CallTargetKind,
    displayName: string,
    sortOrder: number,
  ): Promise<string> => {
    const m = await ensureMemorial()
    const target = await upsertCallTarget(m.editToken!, kind, displayName, sortOrder)
    return target.id
  }

  const handleUpload = async (
    targetId: string,
    files: FileList,
    currentPhotos: { id: string; publicUrl: string }[],
    setDraft: (d: TargetDraft) => void,
    draft: TargetDraft,
  ) => {
    if (!memorial?.editToken) return
    setLoading(true)
    setError(null)
    try {
      const newPhotos = [...currentPhotos]
      for (let i = 0; i < files.length; i++) {
        const asset = await uploadPhoto(
          memorial.editToken,
          targetId,
          files[i],
          currentPhotos.length + i,
        )
        newPhotos.push({ id: asset.id, publicUrl: asset.publicUrl })
      }
      setDraft({ ...draft, id: targetId, photos: newPhotos })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
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
      setError(err instanceof Error ? err.message : 'Failed to create memorial')
    } finally {
      setLoading(false)
    }
  }

  const continueFromDogA = async () => {
    if (dogA.photos.length === 0) {
      setError('Please add at least one photo.')
      return
    }
    const name = dogA.displayName.trim() || 'Dog'
    setLoading(true)
    try {
      await saveTarget('dog_a', name, 0)
      setStep('dog_b_choice')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
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
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const continueFromDogB = async () => {
    if (dogB.photos.length === 0) {
      setError('Please add at least one photo.')
      return
    }
    setLoading(true)
    try {
      await saveTarget('dog_b', dogB.displayName.trim() || 'Dog 2', 1)
      setStep('together_choice')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
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
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const finishTogether = async () => {
    if (together.photos.length === 0) {
      setError('Please add at least one photo.')
      return
    }
    setLoading(true)
    try {
      await saveTarget('together', together.displayName.trim() || 'Together', 2)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const skipToDone = () => setStep('done')

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

        {error && <p className="form-error">{error}</p>}

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
                onChange={(e) => setDogA({ ...dogA, displayName: e.target.value })}
              />
            </label>
            <PhotoUploader
              photos={dogA.photos.map((p) => ({
                id: p.id,
                publicUrl: p.publicUrl,
                storagePath: '',
                reactionTag: null,
                sortOrder: 0,
              }))}
              onUpload={(files) =>
                handleUpload(dogA.id, files, dogA.photos, setDogA, dogA)
              }
              onDelete={() => {}}
              disabled={loading}
            />
            <button
              type="button"
              className="btn-call"
              disabled={loading || dogA.photos.length === 0}
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
                onChange={(e) => setDogB({ ...dogB, displayName: e.target.value })}
              />
            </label>
            <PhotoUploader
              photos={dogB.photos.map((p) => ({
                id: p.id,
                publicUrl: p.publicUrl,
                storagePath: '',
                reactionTag: null,
                sortOrder: 0,
              }))}
              onUpload={(files) =>
                handleUpload(dogB.id, files, dogB.photos, setDogB, dogB)
              }
              onDelete={() => {}}
              disabled={loading}
            />
            <button
              type="button"
              className="btn-call"
              disabled={loading || dogB.photos.length === 0}
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
                storagePath: '',
                reactionTag: null,
                sortOrder: 0,
              }))}
              onUpload={(files) =>
                handleUpload(
                  together.id,
                  files,
                  together.photos,
                  setTogether,
                  together,
                )
              }
              onDelete={() => {}}
              disabled={loading}
            />
            <button
              type="button"
              className="btn-call"
              disabled={loading || together.photos.length === 0}
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
