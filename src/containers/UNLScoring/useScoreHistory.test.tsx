import axios from 'axios'
import { mount } from 'enzyme'
import { useEffect } from 'react'
import { act } from 'react-dom/test-utils'
import { QueryClient, QueryClientProvider } from 'react-query'
import { useScoreHistory } from './useScoreHistory'
import type { UseScoreHistoryResult } from './useScoreHistory'

jest.mock('axios')

const axiosGet = axios.get as jest.Mock

const flushPromises = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const flushHistory = async (remaining = 8): Promise<void> => {
  if (remaining === 0) return
  await act(async () => {
    await flushPromises()
  })
  await flushHistory(remaining - 1)
}

const mountProbe = (
  masterKey: string,
  onResult: (result: UseScoreHistoryResult) => void,
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const Probe = () => {
    const result = useScoreHistory(masterKey, true)
    useEffect(() => {
      onResult(result)
    }, [result])
    return <span>{String(result.isLoading)}</span>
  }

  return mount(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  )
}

describe('useScoreHistory artifact compatibility', () => {
  afterEach(() => {
    axiosGet.mockReset()
  })

  it('builds history from staged and legacy round artifacts', async () => {
    axiosGet.mockImplementation((url: string) => {
      if (url === '/api/scoring/rounds?limit=10') {
        return Promise.resolve({
          data: {
            rounds: [
              { round_number: 11, status: 'COMPLETE' },
              { round_number: 10, status: 'COMPLETE' },
            ],
          },
        })
      }
      if (url === '/api/scoring/rounds/11/outputs/validator_scores.json') {
        return Promise.resolve({
          data: {
            validator_scores: [
              {
                master_key: 'nHBvalidatorA',
                score: 90,
                consensus: 90,
                reliability: 90,
                software: 90,
                diversity: 90,
                identity: 90,
                reasoning: 'staged',
              },
            ],
          },
        })
      }
      if (url === '/api/scoring/rounds/11/outputs/selected_unl.json') {
        return Promise.resolve({
          data: { unl: ['nHBvalidatorA'], alternates: [] },
        })
      }
      if (
        url === '/api/scoring/rounds/10/outputs/validator_scores.json' ||
        url === '/api/scoring/rounds/10/outputs/selected_unl.json'
      ) {
        return Promise.reject(new Error(`Not found: ${url}`))
      }
      if (url === '/api/scoring/rounds/10/scores.json') {
        return Promise.resolve({
          data: {
            validator_scores: [
              {
                master_key: 'nHBvalidatorA',
                score: 75,
                consensus: 75,
                reliability: 75,
                software: 75,
                diversity: 75,
                identity: 75,
                reasoning: 'legacy',
              },
            ],
          },
        })
      }
      if (url === '/api/scoring/rounds/10/unl.json') {
        return Promise.resolve({
          data: { unl: [], alternates: ['nHBvalidatorA'] },
        })
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })

    const latestResult: { current: UseScoreHistoryResult | null } = {
      current: null,
    }
    const wrapper = mountProbe('nHBvalidatorA', (result) => {
      latestResult.current = result
    })

    await flushHistory()
    wrapper.update()

    expect(latestResult.current?.isLoading).toBe(false)
    expect(latestResult.current?.points).toEqual([
      { round_number: 10, score: 75, status: 'candidate' },
      { round_number: 11, score: 90, status: 'on_unl' },
    ])
    expect(axiosGet).toHaveBeenCalledWith(
      '/api/scoring/rounds/11/outputs/validator_scores.json',
    )
    expect(axiosGet).not.toHaveBeenCalledWith(
      '/api/scoring/rounds/11/scores.json',
    )
    expect(axiosGet).toHaveBeenCalledWith(
      '/api/scoring/rounds/10/outputs/validator_scores.json',
    )
    expect(axiosGet).toHaveBeenCalledWith('/api/scoring/rounds/10/scores.json')

    wrapper.unmount()
  })
})
