import { FC, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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

  return (
    <div className="dashboard-panel">
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
          <JsonView data={data} />
        </div>
      )}
    </div>
  )
}
