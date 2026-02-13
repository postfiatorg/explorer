import { FC } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Logo from '../../shared/images/PFTLedger.svg'
import { CommandSearch } from './CommandSearch'
import { ThemeToggle } from './ThemeToggle'
import { NetworkPicker } from '../../Header/NetworkPicker/NetworkPicker'
import { LanguagePicker } from '../../Header/LanguagePicker/LanguagePicker'
import './topbar.scss'

interface TopBarProps {
  onMenuClick?: () => void
}

export const TopBar: FC<TopBarProps> = ({ onMenuClick }) => (
  <header className="topbar-layout">
    <div className="topbar-left">
      <button
        type="button"
        className="topbar-menu-btn"
        onClick={onMenuClick}
        title="Toggle menu"
      >
        <Menu size={20} />
      </button>
      <Link to="/" className="topbar-logo">
        <Logo className="topbar-logo-img" />
      </Link>
    </div>
    <div className="topbar-center">
      <CommandSearch />
    </div>
    <div className="topbar-right">
      <NetworkPicker />
      <LanguagePicker />
      <ThemeToggle />
    </div>
  </header>
)
