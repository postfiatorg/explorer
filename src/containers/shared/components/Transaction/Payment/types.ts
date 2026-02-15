import { ExplorerAmount } from '../../../types'

export interface PaymentInstructions {
  sender: string
  partial: boolean
  amount: ExplorerAmount
  max?: ExplorerAmount
  convert?: ExplorerAmount
  destination: string
  sourceTag?: number
}
