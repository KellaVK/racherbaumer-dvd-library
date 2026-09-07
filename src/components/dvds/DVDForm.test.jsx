import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import DVDForm, { EMPTY_DVD_FORM } from './DVDForm'

describe('DVDForm', () => {
  it('renders every editable catalog field and reports changes', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [value, setValue] = useState(EMPTY_DVD_FORM)
      return <DVDForm value={value} onChange={setValue} errors={{}} />
    }
    render(<Harness />)
    expect(screen.getByLabelText(/also featuring/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/penguin magic/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^title/i), 'New DVD')
    expect(screen.getByLabelText(/^title/i)).toHaveValue('New DVD')
  })
})
