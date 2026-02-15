import { mount } from 'enzyme'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter as Router } from 'react-router-dom'
import { SimpleTab } from '../SimpleTab'
import i18n from '../../../i18n/testConfigEnglish'
import validator from './mock_data/validator.json'
import { V7_FUTURE_ROUTER_FLAGS } from '../../test/utils'

describe('SimpleTab container', () => {
  const createWrapper = () =>
    mount(
      <I18nextProvider i18n={i18n}>
        <Router future={V7_FUTURE_ROUTER_FLAGS}>
          <SimpleTab data={validator} />
        </Router>
      </I18nextProvider>,
    )

  it('renders detail rows', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.validator-details').length).toBe(1)
    expect(wrapper.find('.validator-detail-row').length).toBeGreaterThan(0)
    wrapper.unmount()
  })
})
