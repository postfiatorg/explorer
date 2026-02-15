import { FC } from 'react'
import PftIcon from '../images/pft-loader.svg'
import '../css/loader.scss'

export const Loader: FC<{ className?: string }> = ({ className }) => (
  <div className={`loader ${className}`}>
    <PftIcon className="loader-icon" aria-label="Loading" />
  </div>
)
