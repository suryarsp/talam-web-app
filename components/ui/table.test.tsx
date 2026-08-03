import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './table'

describe('Table', () => {
  it('renders header and row cells', () => {
    render(
      <Table>
        <TableHeader><TableRow><TableHead>Order</TableHead></TableRow></TableHeader>
        <TableBody><TableRow><TableCell>#1045</TableCell></TableRow></TableBody>
      </Table>
    )
    expect(screen.getByRole('columnheader', { name: 'Order' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '#1045' })).toBeInTheDocument()
  })
})
