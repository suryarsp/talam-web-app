import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from './textarea'

describe('Textarea', () => {
  it('renders a textarea and accepts input', async () => {
    const user = userEvent.setup()
    render(<Textarea aria-label="notes" />)
    const el = screen.getByRole('textbox', { name: 'notes' })
    await user.type(el, 'hello')
    expect(el).toHaveValue('hello')
  })
})
