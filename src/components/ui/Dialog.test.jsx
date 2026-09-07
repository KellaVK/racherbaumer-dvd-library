import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Dialog from './Dialog'

function Harness({ dirty = false, onClose = vi.fn() }) {
  const [open, setOpen] = useState(false)
  return <>
    <button onClick={() => setOpen(true)}>Open editor</button>
    <Dialog open={open} title="Edit DVD" dirty={dirty} onClose={() => { setOpen(false); onClose() }}>
      <label>Title<input aria-label="Title" /></label>
      <button>Save</button>
    </Dialog>
  </>
}

describe('Dialog', () => {
  it('labels the modal, moves focus in, closes on Escape, and restores focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open editor' })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Edit DVD' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveFocus())
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('keeps Tab navigation inside the dialog', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open editor' }))
    screen.getByLabelText('Title').focus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Close Edit DVD' })).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('asks before discarding dirty changes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<Harness dirty />)
    fireEvent.click(screen.getByRole('button', { name: 'Open editor' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(confirm).toHaveBeenCalledTimes(2)
    confirm.mockRestore()
  })
})
