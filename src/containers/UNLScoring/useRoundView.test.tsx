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

    let latestResult: UseRoundViewResult | null = null
    const wrapper = mountProbe(2, (result) => {
      latestResult = result
    })

    await act(async () => {
      await flushPromises()
    })
    wrapper.update()

    expect(latestResult?.view?.kind).toBe('failed')
    expect(latestResult?.isLoading).toBe(false)
    expect(latestResult?.roundNotFound).toBe(false)
    expect(axiosGet).toHaveBeenCalledWith('/api/scoring/rounds/2')
    expect(axiosGet).not.toHaveBeenCalledWith(
      '/api/scoring/rounds/2/scores.json',
    )
    expect(axiosGet).not.toHaveBeenCalledWith('/api/scoring/rounds/2/unl.json')

    wrapper.unmount()
  })
})
