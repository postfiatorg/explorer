import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery } from 'react-query'

import { useAnalytics } from '../../shared/analytics'
import SocketContext from '../../shared/SocketContext'
import { TransactionFeed } from '../../shared/components/TransactionFeed/TransactionFeed'
import { getAccountTransactions } from '../../../rippled'

export interface TokenTransactionsTableProps {
  accountId: string
  currency: string
}

export const TokenTransactionTable = ({
  accountId,
  currency,
}: TokenTransactionsTableProps) => {
  const { trackException } = useAnalytics()
  const rippledSocket = useContext(SocketContext)
  const { t } = useTranslation()

  const {
    data,
    error,
    isFetching: loading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<any, Error>(
    ['fetchTransactions', accountId, currency],
    ({ pageParam = '' }) =>
      getAccountTransactions(
        accountId,
        currency,
        pageParam,
        undefined,
        rippledSocket,
      ).catch((errorResponse) => {
        const errorLocation = `token transactions ${accountId}.${currency} at ${pageParam}`
        trackException(`${errorLocation} --- ${JSON.stringify(errorResponse)}`)

        throw new Error('get_account_transactions_failed')
      }),
    {
      getNextPageParam: (lastPage) => lastPage.marker,
    },
  )

  return (
    <TransactionFeed
      transactions={data?.pages?.map((page: any) => page.transactions).flat()}
      loading={loading}
      emptyMessage={t(error?.message || ('' as any))}
      onLoadMore={() => fetchNextPage()}
      hasAdditionalResults={hasNextPage}
    />
  )
}
