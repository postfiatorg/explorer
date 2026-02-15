import { FC, ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './collapsiblePanel.scss'

interface CollapsiblePanelProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
  count?: number
}

export const CollapsiblePanel: FC<CollapsiblePanelProps> = ({
  title,
  defaultOpen = true,
  children,
  count,
}) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="collapsible-panel dashboard-panel">
      <button
        type="button"
        className="collapsible-panel-header"
        onClick={() => setOpen(!open)}
      >
        <span className="collapsible-panel-title">{title}</span>
        {count != null && (
          <span className="collapsible-panel-count">{count}</span>
        )}
        <ChevronDown
          size={18}
          className={`collapsible-panel-chevron ${open ? 'open' : ''}`}
        />
      </button>
      {open && <div className="collapsible-panel-body">{children}</div>}
    </div>
  )
}
