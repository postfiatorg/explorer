import { useContext } from 'react'
import { useInfiniteQuery } from 'react-query'
import './styles.scss'
import SocketContext from '../../shared/SocketContext'
import { getNFTTransactions } from '../../../rippled/NFTTransactions'
import { TransactionFeed } from '../../shared/components/TransactionFeed/TransactionFeed'

interface Props {
  tokenId: string
}

export const Transactions = (props: Props) => {
  const { tokenId } = props
  const rippledSocket = useContext(SocketContext)

  const {
    data,
    isFetching: loading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery(
    ['fetchTransactions', tokenId],
    ({ pageParam = '' }) =>
      getNFTTransactions(rippledSocket, tokenId, undefined, pageParam),
    {
      getNextPageParam: (lastPage) => lastPage.marker,
    },
  )

  const flatData = data?.pages?.map((page: any) => page.transactions).flat()

  return (
    <TransactionFeed
      transactions={flatData ?? []}
      loading={loading}
      onLoadMore={() => fetchNextPage()}
      hasAdditionalResults={hasNextPage}
    />
  )
}
