import { ReactElement } from 'react'
import { TransactionAction, TransactionCategory } from '../Transaction/types'
import { getAction, getCategory } from '../Transaction'
import TransactionCancelIcon from './TransactionCancelIcon.svg'
import TransactionCreateIcon from './TransactionCreateIcon.svg'
import TransactionFinishIcon from './TransactionFinishIcon.svg'
import TransactionModifyIcon from './TransactionModifyIcon.svg'
import TransactionSendIcon from './TransactionSendIcon.svg'
import TransactionUnknownIcon from './TransactionUnknownIcon.svg'

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  [TransactionCategory.PAYMENT]: 'var(--green-50)',
  [TransactionCategory.DEX]: 'var(--blue-50)',
  [TransactionCategory.ACCOUNT]: 'var(--magenta-50)',
  [TransactionCategory.NFT]: 'var(--blue-purple-50)',
  [TransactionCategory.XCHAIN]: 'var(--yellow-50)',
  [TransactionCategory.MPT]: 'var(--blue-50)',
  [TransactionCategory.PSEUDO]: 'var(--black-50)',
  [TransactionCategory.OTHER]: 'var(--black-50)',
}

const CATEGORY_BG_COLORS: Record<TransactionCategory, string> = {
  [TransactionCategory.PAYMENT]: 'var(--green-90)',
  [TransactionCategory.DEX]: 'var(--blue-90)',
  [TransactionCategory.ACCOUNT]: 'var(--magenta-90)',
  [TransactionCategory.NFT]: 'var(--blue-purple-90)',
  [TransactionCategory.XCHAIN]: 'var(--yellow-90)',
  [TransactionCategory.MPT]: 'var(--blue-90)',
  [TransactionCategory.PSEUDO]: 'var(--black-80)',
  [TransactionCategory.OTHER]: 'var(--black-80)',
}

export type TransactionActionIconProps =
  | { action: TransactionAction; type?: never; withBackground?: boolean }
  | { action?: never; type: string; withBackground?: boolean }

export const TransactionActionIcon = ({
  action,
  type,
  withBackground = false,
}: TransactionActionIconProps) => {
  const icons: Record<TransactionAction, ReactElement> = {
    [TransactionAction.CANCEL]: <TransactionCancelIcon />,
    [TransactionAction.CREATE]: <TransactionCreateIcon />,
    [TransactionAction.FINISH]: <TransactionFinishIcon />,
    [TransactionAction.MODIFY]: <TransactionModifyIcon />,
    [TransactionAction.SEND]: <TransactionSendIcon />,
    [TransactionAction.UNKNOWN]: <TransactionUnknownIcon />,
  }

  let icon = type && icons[getAction(type)]
  const category = type ? getCategory(type) : TransactionCategory.OTHER

  if (action) {
    icon = icons[action]
  }

  const resolvedIcon = icon || icons[TransactionAction.UNKNOWN]

  if (!withBackground) {
    return resolvedIcon
  }

  return (
    <span
      className="tx-action-icon-circle"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: CATEGORY_BG_COLORS[category],
        color: CATEGORY_COLORS[category],
        flexShrink: 0,
      }}
    >
      {resolvedIcon}
    </span>
  )
}
