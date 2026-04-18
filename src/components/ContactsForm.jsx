import { useState } from 'react'
import useAppContext from '../hooks/useAppContext'

function ContactsForm() {
  const { contacts, addContact, updateContact, deleteContact } = useAppContext()
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [relationship, setRelationship] = useState('')
  const [editingContactId, setEditingContactId] = useState(null)
  const [editDraft, setEditDraft] = useState({ name: '', number: '', relationship: '' })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!name.trim() || !number.trim()) {
      setErrorMessage('Contact name and number are required.')
      return
    }

    setIsSaving(true)
    try {
      await addContact(name, number, relationship)
      setName('')
      setNumber('')
      setRelationship('')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage('Unable to save contact.')
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (contact) => {
    setEditingContactId(contact.id)
    setEditDraft({
      name: contact.name || '',
      number: contact.number || '',
      relationship: contact.relationship || '',
    })
    setErrorMessage('')
  }

  const saveContact = async () => {
    if (!editDraft.name.trim() || !editDraft.number.trim()) {
      setErrorMessage('Contact name and number are required.')
      return
    }

    setIsSaving(true)
    try {
      await updateContact(editingContactId, editDraft)
      setEditingContactId(null)
      setEditDraft({ name: '', number: '', relationship: '' })
      setErrorMessage('')
    } catch (error) {
      setErrorMessage('Unable to update contact.')
    } finally {
      setIsSaving(false)
    }
  }

  const removeContact = async (contactId) => {
    setIsSaving(true)
    try {
      await deleteContact(contactId)
      if (editingContactId === contactId) {
        setEditingContactId(null)
      }
      setErrorMessage('')
    } catch (error) {
      setErrorMessage('Unable to delete contact.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <h2 className="text-base font-semibold text-[#0B3D91]">Trusted Contacts</h2>
        <p className="text-xs text-slate-600">Stored in your account and used for SOS notifications.</p>
        {errorMessage && <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{errorMessage}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contact name"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
          />
          <input
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="Phone number"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
          />
          <input
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            placeholder="Relationship"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B3D91] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a367f] disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? 'Saving...' : 'Add Contact'}
        </button>
      </form>

      <div className="space-y-2">
        {contacts.map((contact) => (
          <div key={contact.id} className="rounded-lg border border-slate-200 bg-white p-3">
            {editingContactId === contact.id ? (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    value={editDraft.name}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B3D91]"
                  />
                  <input
                    value={editDraft.number}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, number: event.target.value }))}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B3D91]"
                  />
                  <input
                    value={editDraft.relationship}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, relationship: event.target.value }))}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B3D91]"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={saveContact} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" disabled={isSaving}>Save</button>
                  <button type="button" onClick={() => setEditingContactId(null)} className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{contact.name}</p>
                  <p className="text-xs text-slate-600">{contact.number}</p>
                  <p className="text-xs text-slate-500">{contact.relationship || 'Trusted contact'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEditing(contact)} className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Edit</button>
                  <button type="button" onClick={() => removeContact(contact.id)} className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" disabled={isSaving}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {contacts.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">No trusted contacts added yet.</p>
        )}
      </div>
    </div>
  )
}

export default ContactsForm
