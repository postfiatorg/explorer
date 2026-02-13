import { FC } from 'react'
import { Simple } from './Simple'
import '../shared/css/simpleTab.scss'
import './simpleTab.scss'

export const SimpleTab: FC<{ data: any }> = ({ data }) => {
  const { processed } = data

  return (
    <div className="simple-body simple-body-tx">
      <div className="rows">
        <Simple type={processed.tx.TransactionType} data={data.summary} />
      </div>
    </div>
  )
}
