import { useTranslation } from 'react-i18next'

import Logo from '../shared/images/XRPLedger.svg'
import './footer.scss'

const Footer = () => {
  const { t } = useTranslation()

  return (
    <footer className="footer">
      <div className="footer-links">
        <div className="footer-link-section">
          <div className="footer-section-header">Learn</div>
          <a href="https://postfiat.org/" className="footer-link">
            Overview
          </a>
          <a href="https://postfiat.org/" className="footer-link">
            Uses
          </a>
          <a href="https://postfiat.org/" className="footer-link">
            History
          </a>
          <a href="https://postfiat.org/" className="footer-link">
            Impact
          </a>
        </div>

        <div className="footer-link-section">
          <div className="footer-section-header">Build</div>
          <a href="https://postfiat.org/" className="footer-link">
            Get Started
          </a>
          <a href="https://postfiat.org/" className="footer-link">
            Docs
          </a>
          <a href="https://postfiat.org/" className="footer-link">
            Tools
          </a>
          <a
            href="https://explorer.testnet.postfiat.org/"
            className="footer-link"
          >
            Ledger Explorer
          </a>
        </div>

        <div className="footer-link-section">
          <div className="footer-section-header">Contribute</div>
          <a href="https://postfiat.org/" className="footer-link">
            How to Contribute
          </a>
          <a
            href="https://github.com/postfiatorg/explorer"
            className="footer-link"
          >
            PFT Explorer on GitHub
          </a>
        </div>
      </div>
      <div className="footer-branding">
        <div className="logo">
          <Logo className="image" alt={t('xrpl_explorer')} />
          <span className="text">
            {t('explorer')}
            <span className="version">
              {' '}
              {t('version', { number: process.env.VITE_APP_VERSION })}
            </span>
          </span>
        </div>
        <div className="copyright">
          <span>&#169;&nbsp;</span>
          <a
            className="link"
            target="_blank"
            rel="noopener noreferrer"
            href="https://postfiat.org"
          >
            PFT Ledger Project
          </a>
          <span>&nbsp;2025-{new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
