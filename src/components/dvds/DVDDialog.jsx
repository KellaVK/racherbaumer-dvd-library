import { useEffect, useMemo, useState } from 'react'
import Dialog from '../ui/Dialog'
import Notice from '../ui/Notice'
import DVDForm, { dvdToForm, EMPTY_DVD_FORM } from './DVDForm'
import { createDVD, updateDVD } from '../../services/dvds'
import { titleSimilarity, validateDVDForm } from '../../utils/dvd'
import { useToast } from '../../contexts/ToastContext'

export default function DVDDialog({ open, dvd, dvds = [], onClose, onSaved }) {
  const initial = useMemo(() => dvdToForm(dvd || EMPTY_DVD_FORM), [dvd])
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const { push } = useToast()

  useEffect(() => {
    if (open) {
      setForm(initial)
      setErrors({})
    }
  }, [initial, open])

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const possibleDuplicate = useMemo(() => {
    if (form.title.trim().length < 4) return null
    return dvds.find(item => item.id !== dvd?.id && titleSimilarity(item.title, form.title) >= 0.86) || null
  }, [dvd?.id, dvds, form.title])

  async function save(event) {
    event.preventDefault()
    const validation = validateDVDForm(form)
    setErrors(validation)
    if (Object.keys(validation).length) return
    setSaving(true)
    try {
      if (dvd) {
        await updateDVD(dvd.id, form)
        push({ tone: 'success', message: `Updated “${form.title.trim()}”.` })
      } else {
        const result = await createDVD(form)
        push({
          tone: result.summaryRequested ? 'success' : 'warning',
          message: result.summaryRequested
            ? `Added “${form.title.trim()}”. Its AI summary is being prepared.`
            : `Added “${form.title.trim()}”, but its AI summary could not start. You can retry it later.`,
        })
      }
      onSaved?.()
      onClose()
    } catch (error) {
      if (error.errors) setErrors(error.errors)
      push({ tone: 'danger', message: error.message || 'The DVD could not be saved.' })
    } finally {
      setSaving(false)
    }
  }

  return <Dialog
    open={open}
    title={dvd ? `Edit ${dvd.title}` : 'Add a DVD'}
    dirty={dirty && !saving}
    onClose={onClose}
    footer={<>
      <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
      <button type="submit" form="dvd-editor" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : dvd ? 'Save changes' : 'Add DVD'}</button>
    </>}
  >
    {!dvd && <Notice title="Automatic summary">
      The DVD is saved first, then Claude attempts a summary from the details you enter. A summary failure will never remove the new record.
    </Notice>}
    {possibleDuplicate && <Notice tone="warning" title="Possible duplicate">
      The catalog already contains “{possibleDuplicate.title}”. You can still save this record if it is a different edition or volume.
    </Notice>}
    <form id="dvd-editor" onSubmit={save} style={{ marginTop: '1.25rem' }}>
      <DVDForm value={form} onChange={setForm} errors={errors} />
    </form>
  </Dialog>
}
