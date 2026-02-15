import { FC, useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import './copyableAddress.scss'

interface CopyableAddressProps {
  address: string
  truncate?: boolean
}

export const CopyableAddress: FC<CopyableAddressProps> = ({
  address,
  truncate = false,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [address])

  return (
    <span
      className={`copyable-address ${truncate ? 'copyable-address-truncate' : ''}`}
    >
      <span className="copyable-address-text" title={address}>
        {address}
      </span>
      <button
        type="button"
        className="copyable-address-btn"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </span>
  )
}
