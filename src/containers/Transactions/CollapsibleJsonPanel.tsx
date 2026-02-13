import { FC, useCallback, useState } from 'react'
import { ChevronDown, Copy, Check } from 'lucide-react'
import { JsonView } from '../shared/components/JsonView'

interface CollapsibleJsonPanelProps {
  data: any
  title?: string
}

export const CollapsibleJsonPanel: FC<CollapsibleJsonPanelProps> = ({
  data,
  title = 'Raw JSON',
}) => {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    },
    [data],
  )

  return (
    <div className="dashboard-panel json-panel">
      <button
        type="button"
        className="json-panel-header"
        onClick={() => setOpen(!open)}
      >
        <span className="json-panel-title">{title}</span>
        <ChevronDown
          size={18}
          className={`json-panel-chevron ${open ? 'open' : ''}`}
        />
      </button>
      {open && (
        <div className="json-panel-body">
          <button
            type="button"
            className="json-panel-copy"
            onClick={handleCopy}
            title="Copy JSON"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <JsonView data={data} />
        </div>
      )}
    </div>
  )
}
