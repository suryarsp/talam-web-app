import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select'

describe('Select', () => {
  it('opens and selects an item', async () => {
    const user = userEvent.setup()
    const labels: Record<string, string> = { a: 'Option A', b: 'Option B' }
    render(
      <Select defaultValue="a">
        <SelectTrigger><SelectValue>{(value: string) => labels[value]}</SelectValue></SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
          <SelectItem value="b">Option B</SelectItem>
        </SelectContent>
      </Select>
    )
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Option B'))
    expect(screen.getByRole('combobox')).toHaveTextContent('Option B')
  })
})
