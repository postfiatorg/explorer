import { FC, useRef, useLayoutEffect } from 'react'
import { Simple } from './Simple'
import '../shared/css/simpleTab.scss'
import './simpleTab.scss'

export const SimpleTab: FC<{
  data: any
  onEmpty?: (empty: boolean) => void
}> = ({ data, onEmpty }) => {
  const { processed } = data
  const rowsRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    onEmpty?.(rowsRef.current?.childElementCount === 0)
  }, [data, onEmpty])

  return (
    <div className="simple-body simple-body-tx">
      <div className="rows" ref={rowsRef}>
        <Simple type={processed.tx.TransactionType} data={data.summary} />
      </div>
    </div>
  )
}
