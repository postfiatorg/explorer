import axios from 'axios'
import { mount } from 'enzyme'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { act } from 'react-dom/test-utils'
import { useRoundView } from './useRoundView'
import type { UseRoundViewResult } from './useRoundView'

jest.mock('axios')

const axiosGet = axios.get as jest.Mock

const flushPromises = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const flushRoundView = async (remaining = 8): Promise<void> => {
  if (remaining === 0) return
  await act(async () => {
    await flushPromises()
  })
  await flushRoundView(remaining - 1)
}

const mountProbe = (
  roundNumber: number,
  onResult: (result: UseRoundViewResult) => void,
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const Probe = () => {
    const result = useRoundView(roundNumber)
    useEffect(() => {
      onResult(result)
    }, [result])
    return (
      <div>
        <span className="kind">{result.view?.kind ?? 'none'}</span>
        <span className="loading">{String(result.isLoading)}</span>
      </div>
    )
  }

  return mount(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  )
}

describe('useRoundView failed rounds', () => {
  afterEach(() => {
    axiosGet.mockReset()
  })

  it('returns a terminal failed view without fetching missing score artifacts', async () => {
    axiosGet.mockImplementation((url: string) => {
      if (url === '/api/scoring/rounds/2') {
        return Promise.resolve({
          data: {
            round_number: 2,
            status: 'FAILED',
            completed_at: null,
            started_at: '2026-05-05T16:53:58Z',
            snapshot_hash: null,
            error_message: 'collector timed out',
          },
        })
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })

    const latestResult: { current: UseRoundViewResult | null } = {
      current: null,
    }
    const wrapper = mountProbe(2, (result) => {
      latestResult.current = result
    })

    await flushRoundView()
    wrapper.update()

    expect(latestResult.current?.view?.kind).toBe('failed')
    expect(latestResult.current?.isLoading).toBe(false)
    expect(latestResult.current?.roundNotFound).toBe(false)
    expect(axiosGet).toHaveBeenCalledWith('/api/scoring/rounds/2')
    expect(axiosGet).not.toHaveBeenCalledWith(
      '/api/scoring/rounds/2/scores.json',
    )
    expect(axiosGet).not.toHaveBeenCalledWith('/api/scoring/rounds/2/unl.json')

    wrapper.unmount()
  })
})

describe('useRoundView artifact compatibility', () => {
  afterEach(() => {
    axiosGet.mockReset()
  })

  const scores = {
    validator_scores: [
      {
        master_key: 'nHBvalidatorA',
        score: 91,
        consensus: 92,
        reliability: 93,
        software: 94,
        diversity: 95,
        identity: 96,
        reasoning: 'stable validator',
      },
    ],
  }

  const unl = {
    unl: ['nHBvalidatorA'],
    alternates: ['nHBvalidatorB'],
  }

  const snapshot = {
    validators: [
      {
        master_key: 'nHBvalidatorA',
        domain: 'validator.example',
        domain_verified: true,
        asn: null,
        geolocation: null,
        agreement_1h: null,
        agreement_24h: null,
        agreement_30d: null,
        server_version: '3.0.0',
        unl: true,
        base_fee: null,
        identity: null,
        signing_key: 'n9SigningKey',
        ip: '127.0.0.1',
      },
    ],
  }

  const validatorMap = {
    nHBvalidatorA: {
      master_key: 'nHBvalidatorA',
      signing_key: 'n9SigningKey',
    },
  }

  it('loads staged score artifacts and execution-manifest policy', async () => {
    axiosGet.mockImplementation((url: string) => {
      if (url === '/api/scoring/rounds/7') {
        return Promise.resolve({
          data: {
            round_number: 7,
            status: 'COMPLETE',
            completed_at: '2026-05-05T16:53:58Z',
            final_bundle_cid: 'QmFinalBundle',
          },
        })
      }
      if (url === '/api/scoring/rounds/7/outputs/validator_scores.json') {
        return Promise.resolve({ data: scores })
      }
      if (url === '/api/scoring/rounds/7/outputs/selected_unl.json') {
        return Promise.resolve({ data: unl })
      }
      if (url === '/api/scoring/rounds/7/inputs/validator_evidence.json') {
        return Promise.resolve({ data: snapshot })
      }
      if (url === '/api/scoring/rounds/7/inputs/validator_map.json') {
        return Promise.resolve({ data: validatorMap })
      }
      if (url === '/api/scoring/rounds/7/runtime/execution_manifest.json') {
        return Promise.resolve({
          data: {
            code: {
              collector: {
                parameters: {
                  excluded_validator_server_versions: ['3.0.0'],
                },
              },
            },
          },
        })
      }
      if (url === '/api/scoring/rounds?limit=100') {
        return Promise.resolve({
          data: {
            rounds: [{ round_number: 7, status: 'COMPLETE' }],
          },
        })
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })

    const latestResult: { current: UseRoundViewResult | null } = {
      current: null,
    }
    const wrapper = mountProbe(7, (result) => {
      latestResult.current = result
    })

    await flushRoundView()
    wrapper.update()

    const stagedView = latestResult.current?.view
    expect(stagedView?.kind).toBe('scored')
    if (stagedView?.kind === 'scored') {
      expect(stagedView.scores).toBe(scores)
      expect(stagedView.unl).toBe(unl)
      expect(stagedView.snapshot).toBe(snapshot)
      expect(stagedView.validatorIdMap).toBe(validatorMap)
      expect(stagedView.roundConfig).toEqual({
        excluded_validator_server_versions: ['3.0.0'],
      })
    }
    expect(axiosGet).not.toHaveBeenCalledWith(
      '/api/scoring/rounds/7/scores.json',
    )
    expect(axiosGet).not.toHaveBeenCalledWith('/api/scoring/rounds/7/unl.json')
    expect(axiosGet).not.toHaveBeenCalledWith(
      '/api/scoring/rounds/7/snapshot.json',
    )
    expect(axiosGet).not.toHaveBeenCalledWith(
      '/api/scoring/rounds/7/validator_id_map.json',
    )

    wrapper.unmount()
  })

  it('falls back to legacy flat score artifacts', async () => {
    axiosGet.mockImplementation((url: string) => {
      if (url === '/api/scoring/rounds/8') {
        return Promise.resolve({
          data: {
            round_number: 8,
            status: 'COMPLETE',
            completed_at: '2026-05-06T16:53:58Z',
            ipfs_cid: 'QmLegacyBundle',
          },
        })
      }
      if (
        url === '/api/scoring/rounds/8/outputs/validator_scores.json' ||
        url === '/api/scoring/rounds/8/outputs/selected_unl.json' ||
        url === '/api/scoring/rounds/8/inputs/validator_evidence.json' ||
        url === '/api/scoring/rounds/8/inputs/validator_map.json'
      ) {
        return Promise.reject(new Error(`Not found: ${url}`))
      }
      if (url === '/api/scoring/rounds/8/scores.json') {
        return Promise.resolve({ data: scores })
      }
      if (url === '/api/scoring/rounds/8/unl.json') {
        return Promise.resolve({ data: unl })
      }
      if (url === '/api/scoring/rounds/8/snapshot.json') {
        return Promise.resolve({ data: snapshot })
      }
      if (url === '/api/scoring/rounds/8/validator_id_map.json') {
        return Promise.resolve({ data: validatorMap })
      }
      if (url === '/api/scoring/rounds/8/scoring_config.json') {
        return Promise.resolve({
          data: { excluded_validator_server_versions: ['2.9.0'] },
        })
      }
      if (url === '/api/scoring/rounds?limit=100') {
        return Promise.resolve({
          data: {
            rounds: [{ round_number: 8, status: 'COMPLETE' }],
          },
        })
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })

    const latestResult: { current: UseRoundViewResult | null } = {
      current: null,
    }
    const wrapper = mountProbe(8, (result) => {
      latestResult.current = result
    })

    await flushRoundView()
    wrapper.update()

    const legacyView = latestResult.current?.view
    expect(legacyView?.kind).toBe('scored')
    if (legacyView?.kind === 'scored') {
      expect(legacyView.scores).toBe(scores)
      expect(legacyView.unl).toBe(unl)
      expect(legacyView.snapshot).toBe(snapshot)
      expect(legacyView.validatorIdMap).toBe(validatorMap)
      expect(legacyView.roundConfig).toEqual({
        excluded_validator_server_versions: ['2.9.0'],
      })
    }
    expect(axiosGet).toHaveBeenCalledWith(
      '/api/scoring/rounds/8/outputs/validator_scores.json',
    )
    expect(axiosGet).toHaveBeenCalledWith('/api/scoring/rounds/8/scores.json')
    expect(axiosGet).toHaveBeenCalledWith(
      '/api/scoring/rounds/8/outputs/selected_unl.json',
    )
    expect(axiosGet).toHaveBeenCalledWith('/api/scoring/rounds/8/unl.json')

    wrapper.unmount()
  })

  it('loads override rounds from selected UNL artifacts without score artifacts', async () => {
    axiosGet.mockImplementation((url: string) => {
      if (url === '/api/scoring/rounds/9') {
        return Promise.resolve({
          data: {
            round_number: 9,
            status: 'COMPLETE',
            completed_at: '2026-05-07T16:53:58Z',
            final_bundle_cid: 'QmOverrideBundle',
            override_type: 'custom',
          },
        })
      }
      if (url === '/api/scoring/rounds/9/outputs/selected_unl.json') {
        return Promise.resolve({ data: unl })
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })

    const latestResult: { current: UseRoundViewResult | null } = {
      current: null,
    }
    const wrapper = mountProbe(9, (result) => {
      latestResult.current = result
    })

    await flushRoundView()
    wrapper.update()

    const overrideView = latestResult.current?.view
    expect(overrideView?.kind).toBe('override')
    if (overrideView?.kind === 'override') {
      expect(overrideView.unl).toBe(unl)
      expect(overrideView.scores).toBeNull()
      expect(overrideView.roundConfig).toBeNull()
    }
    expect(axiosGet).not.toHaveBeenCalledWith(
      '/api/scoring/rounds/9/outputs/validator_scores.json',
    )
    expect(axiosGet).not.toHaveBeenCalledWith(
      '/api/scoring/rounds/9/scores.json',
    )
    expect(axiosGet).not.toHaveBeenCalledWith(
      '/api/scoring/rounds/9/scoring_config.json',
    )

    wrapper.unmount()
  })
})
