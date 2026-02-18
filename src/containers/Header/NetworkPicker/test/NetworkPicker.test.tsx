import { mount } from 'enzyme'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../../../i18n/testConfigEnglish'
import { NetworkPicker } from '../NetworkPicker'

describe('NetworkPicker component', () => {
  const oldEnvs = process.env

  beforeEach(() => {
    process.env = { ...oldEnvs, VITE_ENVIRONMENT: 'testnet' }
  })

  afterEach(() => {
    process.env = oldEnvs
  })

  it('renders the network name as a badge', () => {
    const wrapper = mount(
      <I18nextProvider i18n={i18n}>
        <NetworkPicker />
      </I18nextProvider>,
    )

    expect(wrapper.find('.network-badge')).toExist()
    expect(wrapper.find('.network-badge-testnet')).toExist()
    wrapper.unmount()
  })

  it('defaults to mainnet when no environment is set', () => {
    process.env = { ...oldEnvs, VITE_ENVIRONMENT: '' }
    const wrapper = mount(
      <I18nextProvider i18n={i18n}>
        <NetworkPicker />
      </I18nextProvider>,
    )

    expect(wrapper.find('.network-badge-mainnet')).toExist()
    wrapper.unmount()
  })
})
