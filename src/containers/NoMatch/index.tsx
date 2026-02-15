import { useContext, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, Home } from 'lucide-react'
import { useAnalytics } from '../shared/analytics'
import SocketContext from '../shared/SocketContext'
import './nomatch.scss'

export interface NoMatchProps {
  title?: string
  hints?: string[]
  isError?: boolean
  errorCode?: number
  warning?: string
}

const NoMatch = ({
  title = 'not_found_default_title',
  hints = ['not_found_check_url'],
  isError = true,
  errorCode,
  warning = undefined,
}: NoMatchProps) => {
  const { track } = useAnalytics()
  const { t } = useTranslation()
  const socket = useContext(SocketContext)
  const values = { connection: socket?.getState() }

  useEffect(() => {
    track('not_found', {
      description: `${title} -- ${hints.join(', ')}`,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...hints, title, track])

  const notFound = title.includes('not_found')
  const derivedWarning = warning ?? (notFound && t('not_found'))

  return (
    <div className="no-match">
      <Helmet title={t(title as any)} />
      <div className="no-match-container">
        {isError && <div className="no-match-code">{errorCode ?? 404}</div>}
        <div className="no-match-title">{t(title as any, values)}</div>
        <div className="no-match-hints">
          {hints.map((hint) => (
            <p key={hint}>{t(hint as any, values)}</p>
          ))}
          {derivedWarning && <p>{derivedWarning}</p>}
        </div>
        <div className="no-match-actions">
          <button
            type="button"
            className="no-match-btn no-match-btn-secondary"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
          <Link to="/" className="no-match-btn no-match-btn-primary">
            <Home size={16} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NoMatch
