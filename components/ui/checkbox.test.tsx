import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './checkbox'

describe('Checkbox', () => {
  it('toggles checked state on click', async () => {
    const user = userEvent.setup()
    render(<Checkbox aria-label="agree" />)
    const el = screen.getByRole('checkbox', { name: 'agree' })
    expect(el).not.toBeChecked()
    await user.click(el)
    expect(el).toBeChecked()
  })
})
