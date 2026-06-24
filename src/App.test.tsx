import fs from 'node:fs'
import path from 'node:path'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

const realmzRoot = process.env.REALMZ_ROOT ?? 'F:\\Realmz'
const traskPath = path.join(realmzRoot, 'out_win_clang', 'Character Files', 'Traskelion')
const hasCharacterFixture = fs.existsSync(traskPath)
const fixtureIt = hasCharacterFixture ? it : it.skip

afterEach(() => {
  cleanup()
})

describe('App', () => {
  it('renders the empty editor shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Realmz Character Editor' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled()
  })

  fixtureIt('uploads a character and exposes editor tabs', async () => {
    render(<App />)
    const bytes = fs.readFileSync(traskPath)
    const file = new File([bytes], 'Traskelion', { type: 'application/octet-stream' })
    const input = screen.getByLabelText('Upload character file')

    await userEvent.upload(input, file)

    await waitFor(() => expect(screen.getByText(/Opened Traskelion/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Spells' })).toBeInTheDocument()
    expect(screen.getByText('Human')).toBeInTheDocument()
  })
})
