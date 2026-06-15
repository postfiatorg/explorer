import { resolveVerificationStatus } from './useIndependentVerification'

const flags = (overrides = {}) => ({
  loadingConfig: false,
  hasPublisher: true,
  enabled: true,
  isError: false,
  isLoading: false,
  hasData: true,
  ...overrides,
})

describe('resolveVerificationStatus', () => {
  it('shows nothing until config loads', () => {
    expect(resolveVerificationStatus(flags({ loadingConfig: true }))).toBe(
      'loading',
    )
  })

  it('hides the section on a backend without commit-reveal support', () => {
    // No publisher address = old scoring backend → unavailable (hidden).
    expect(resolveVerificationStatus(flags({ hasPublisher: false }))).toBe(
      'unavailable',
    )
  })

  it('hides the section when there is no per-round artifact to reconcile', () => {
    expect(resolveVerificationStatus(flags({ enabled: false }))).toBe(
      'unavailable',
    )
  })

  it('surfaces an error when the scan fails', () => {
    expect(resolveVerificationStatus(flags({ isError: true }))).toBe('error')
  })

  it('reports loading while the scan runs or before data arrives', () => {
    expect(resolveVerificationStatus(flags({ isLoading: true }))).toBe(
      'loading',
    )
    expect(resolveVerificationStatus(flags({ hasData: false }))).toBe('loading')
  })

  it('defers to the scan result once settled with data', () => {
    expect(resolveVerificationStatus(flags())).toBeNull()
  })
})
