import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { CallTarget, Memorial } from '../types/memorial'
import type { FocalFrame } from '../utils/focalPoint'
import {
  deleteCallTarget,
  deletePhoto,
  getMemorialByEditToken,
  regenerateShareId,
  updateMediaFocalPoint,
  updateMemorial,
  uploadPhoto,
  upsertCallTarget,
} from '../services/memorialService'
import { editUrl, shareUrl } from '../lib/urls'
import { CopyLinkButton } from './CopyLinkButton'
import { DemoModeBanner } from './DemoModeBanner'
import { PhotoUploader } from './PhotoUploader'

export function EditMemorialView() {
  const { editToken } = useParams<{ editToken: string }>()
  const navigate = useNavigate()
  const [memorial, setMemorial] = useState<Memorial | null>(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!editToken) return
    setLoading(true)
    setError(null)
    try {
      let data = await getMemorialByEditToken(editToken)
      if (!data) {
        setError('Memorial not found. Check your edit link.')
        return
      }
      if (data.targets.length === 0) {
        await upsertCallTarget(editToken, 'dog_a', 'Dog', 0)
        data = await getMemorialByEditToken(editToken)
        if (!data) {
          setError('Memorial not found. Check your edit link.')
          return
        }
      }
      setMemorial(data)
      setTitle(data.title)
      setNote(data.note)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [editToken])

  useEffect(() => {
    void load()
  }, [load])

  const saveMeta = async () => {
    if (!editToken) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateMemorial(editToken, title, note)
      setMemorial(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const updateTargetName = async (target: CallTarget, name: string) => {
    if (!editToken) return
    await upsertCallTarget(editToken, target.kind, name, target.sortOrder)
    void load()
  }

  const handleUpload = async (target: CallTarget, files: File[]) => {
    if (!editToken || files.length === 0) return
    setSaving(true)
    setError(null)
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadPhoto(
          editToken,
          {
            kind: target.kind,
            displayName: target.displayName.trim() || target.kind,
            sortOrder: target.sortOrder,
          },
          files[i],
          target.media.length + i,
        )
      }
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePhoto = async (mediaId: string, storagePath?: string) => {
    if (!editToken || !memorial) return
    setSaving(true)
    setError(null)
    try {
      await deletePhoto(editToken, mediaId, storagePath)
      setMemorial({
        ...memorial,
        targets: memorial.targets.map((target) => ({
          ...target,
          media: target.media.filter((m) => m.id !== mediaId),
        })),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const handleFocalChange = async (mediaId: string, focal: FocalFrame) => {
    if (!editToken || !memorial) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateMediaFocalPoint(editToken, mediaId, focal)
      setMemorial({
        ...memorial,
        targets: memorial.targets.map((target) => ({
          ...target,
          media: target.media.map((photo) =>
            photo.id === mediaId
              ? {
                  ...photo,
                  focalX: updated.focalX,
                  focalY: updated.focalY,
                  focalZoom: updated.focalZoom,
                }
              : photo,
          ),
        })),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save focus')
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateShare = async () => {
    if (!editToken || !memorial) return
    if (!window.confirm('Generate a new share link? The old link will stop working.')) return
    setSaving(true)
    try {
      const newShareId = await regenerateShareId(editToken)
      setMemorial({ ...memorial, shareId: newShareId })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const addDogB = async () => {
    if (!editToken) return
    setSaving(true)
    try {
      await upsertCallTarget(editToken, 'dog_b', 'Dog 2', 1)
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const addTogether = async () => {
    if (!editToken) return
    setSaving(true)
    try {
      await upsertCallTarget(editToken, 'together', 'Together', 2)
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const removeTarget = async (targetId: string) => {
    if (!editToken) return
    if (!window.confirm('Remove this call target and its photos?')) return
    setSaving(true)
    try {
      await deleteCallTarget(editToken, targetId)
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="screen form-screen">
        <div className="form-content centered">
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  if (!memorial) {
    return (
      <div className="screen form-screen">
        <div className="form-content centered">
          <p className="form-error">{error ?? 'Not found'}</p>
          <button type="button" className="btn-text" onClick={() => navigate('/')}>
            Go home
          </button>
        </div>
      </div>
    )
  }

  const hasDogB = memorial.targets.some((t) => t.kind === 'dog_b')
  const hasTogether = memorial.targets.some((t) => t.kind === 'together')

  return (
    <div className="screen form-screen">
      <DemoModeBanner />
      <div className="form-content scrollable">
        <header className="form-header">
          <button type="button" className="btn-text back-btn" onClick={() => navigate('/')}>
            ← Home
          </button>
          <h1>Edit Memorial</h1>
        </header>

        {error && <p className="form-error">{error}</p>}

        <div className="form-step">
          <label>
            Memorial name
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Note
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </label>
          <button type="button" className="btn-secondary" onClick={saveMeta} disabled={saving}>
            Save details
          </button>
        </div>

        {memorial.targets.map((target) => (
          <div key={target.id} className="form-step target-edit">
            <div className="target-header">
              <label>
                {target.kind === 'dog_a'
                  ? 'Dog 1'
                  : target.kind === 'dog_b'
                    ? 'Dog 2'
                    : 'Together'}
                <input
                  value={target.displayName}
                  onChange={(e) =>
                    setMemorial({
                      ...memorial,
                      targets: memorial.targets.map((t) =>
                        t.id === target.id
                          ? { ...t, displayName: e.target.value }
                          : t,
                      ),
                    })
                  }
                  onBlur={(e) => updateTargetName(target, e.target.value)}
                />
              </label>
              {target.kind !== 'dog_a' && (
                <button
                  type="button"
                  className="btn-text danger"
                  onClick={() => removeTarget(target.id)}
                >
                  Remove
                </button>
              )}
            </div>
            <PhotoUploader
              photos={target.media}
              onUpload={(files) => handleUpload(target, files)}
              onDelete={(mediaId) => {
                const photo = target.media.find((m) => m.id === mediaId)
                void handleDeletePhoto(mediaId, photo?.storagePath)
              }}
              onFocalChange={(mediaId, focal) => void handleFocalChange(mediaId, focal)}
              preferWideFrame={target.kind === 'together'}
              disabled={saving}
            />
          </div>
        ))}

        <div className="form-step add-targets">
          {!hasDogB && (
            <button type="button" className="btn-secondary" onClick={addDogB} disabled={saving}>
              + Add Dog 2
            </button>
          )}
          {!hasTogether && (
            <button type="button" className="btn-secondary" onClick={addTogether} disabled={saving}>
              + Add Together photos
            </button>
          )}
        </div>

        <div className="form-step done-step">
          <h3>Share links</h3>
          <div className="link-actions">
            <CopyLinkButton label="Copy share link" url={shareUrl(memorial.shareId)} />
            <CopyLinkButton
              label="Copy edit link"
              url={editUrl(editToken!)}
              className="btn-text link-btn"
            />
          </div>
          <button
            type="button"
            className="btn-text"
            onClick={handleRegenerateShare}
            disabled={saving}
          >
            Regenerate share link
          </button>
          <button
            type="button"
            className="btn-call"
            onClick={() => navigate(`/m/${memorial.shareId}`)}
          >
            Preview memorial
          </button>
        </div>
      </div>
    </div>
  )
}
