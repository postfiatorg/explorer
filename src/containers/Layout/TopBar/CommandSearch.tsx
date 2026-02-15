import {
  FC,
  KeyboardEventHandler,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { XrplClient } from 'xrpl-client'
import {
  isValidClassicAddress,
  isValidXAddress,
  classicAddressToXAddress,
} from 'ripple-address-codec'
import { Search } from 'lucide-react'

import { useAnalytics } from '../../shared/analytics'
import SocketContext from '../../shared/SocketContext'
import {
  CURRENCY_REGEX,
  DECIMAL_REGEX,
  FULL_CURRENCY_REGEX,
  HASH256_REGEX,
  VALIDATORS_REGEX,
  CTID_REGEX,
  HASH192_REGEX,
} from '../../shared/utils'
import { getTransaction } from '../../../rippled/lib/rippled'
import { buildPath } from '../../shared/routing'
import {
  ACCOUNT_ROUTE,
  LEDGER_ROUTE,
  NFT_ROUTE,
  TOKEN_ROUTE,
  TRANSACTION_ROUTE,
  VALIDATOR_ROUTE,
  MPT_ROUTE,
} from '../../App/routes'
import TokenSearchResults from '../../shared/components/TokenSearchResults/TokenSearchResults'
import './commandSearch.scss'

const determineHashType = async (id: string, rippledContext: XrplClient) => {
  try {
    await getTransaction(rippledContext, id)
    return 'transactions'
  } catch (e) {
    return 'nft'
  }
}

const separators = /[.:+-]/

const getRoute = async (
  id: string,
  rippledContext: XrplClient,
): Promise<{ type: string; path: string } | null> => {
  if (DECIMAL_REGEX.test(id)) {
    return {
      type: 'ledgers',
      path: buildPath(LEDGER_ROUTE, { identifier: id }),
    }
  }
  if (isValidClassicAddress(id)) {
    return {
      type: 'accounts',
      path: buildPath(ACCOUNT_ROUTE, { id: normalizeAccount(id) }),
    }
  }
  if (HASH256_REGEX.test(id)) {
    const type = await determineHashType(id, rippledContext)
    const path =
      type === 'transactions'
        ? buildPath(TRANSACTION_ROUTE, { identifier: id.toUpperCase() })
        : buildPath(NFT_ROUTE, { id: id.toUpperCase() })
    return { path, type }
  }
  if (HASH192_REGEX.test(id)) {
    return { path: buildPath(MPT_ROUTE, { id: id.toUpperCase() }), type: 'mpt' }
  }
  if (isValidXAddress(id) || isValidClassicAddress(id.split(':')[0])) {
    return {
      type: 'accounts',
      path: buildPath(ACCOUNT_ROUTE, { id: normalizeAccount(id) }),
    }
  }
  if (
    (CURRENCY_REGEX.test(id) || FULL_CURRENCY_REGEX.test(id)) &&
    isValidClassicAddress(id.split(separators)[1])
  ) {
    const components = id.split(separators)
    return {
      type: 'token',
      path: buildPath(TOKEN_ROUTE, {
        token: `${components[0]}.${components[1]}`,
      }),
    }
  }
  if (VALIDATORS_REGEX.test(id)) {
    return {
      type: 'validators',
      path: buildPath(VALIDATOR_ROUTE, { identifier: normalizeAccount(id) }),
    }
  }
  if (CTID_REGEX.test(id)) {
    return {
      type: 'transactions',
      path: buildPath(TRANSACTION_ROUTE, { identifier: id.toUpperCase() }),
    }
  }
  return null
}

const normalizeAccount = (id: string) => {
  if (!id.includes(':')) return id
  const components = id.split(':')
  try {
    return classicAddressToXAddress(
      components[0],
      components[1] === undefined || components[1] === 'false'
        ? false
        : Number(components[1]),
      false,
    )
  } catch (_) {
    return id
  }
}

export const CommandSearch: FC = () => {
  const { track } = useAnalytics()
  const { t } = useTranslation()
  const socket = useContext(SocketContext)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  const handleSearch = useCallback(
    async (id: string) => {
      const strippedId = id.replace(/^["']|["']$/g, '')
      const route = await getRoute(strippedId, socket)
      track('search', {
        search_term: strippedId,
        search_category: route?.type,
      })
      navigate(route === null ? `/search/${strippedId}` : route.path)
      setValue('')
      inputRef.current?.blur()
    },
    [socket, navigate, track],
  )

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      handleSearch(event.currentTarget?.value?.trim())
    }
    if (event.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className={`command-search ${focused ? 'focused' : ''}`}>
      <Search size={16} className="command-search-icon" />
      <input
        ref={inputRef}
        type="text"
        className="command-search-input"
        placeholder={t('header.search.placeholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
      />
      <kbd className="command-search-kbd">
        <span>{navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'}</span>K
      </kbd>
      {process.env.VITE_ENVIRONMENT === 'mainnet' &&
        focused &&
        value.length > 0 && (
          <div className="command-search-results">
            <TokenSearchResults
              setCurrentSearchInput={setValue}
              currentSearchValue={value}
            />
          </div>
        )}
    </div>
  )
}
