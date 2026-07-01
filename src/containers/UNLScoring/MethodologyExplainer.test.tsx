import { mount } from 'enzyme'
import { MethodologyExplainer } from './MethodologyExplainer'
import type { ScoringConfig } from '../Network/scoringUtils'

const config: ScoringConfig = {
  cadence_hours: 672,
  unl_score_cutoff: 40,
  unl_max_size: 3,
  unl_min_score_gap: 5,
}

describe('MethodologyExplainer', () => {
  it('renders the three sections', () => {
    const wrapper = mount(<MethodologyExplainer config={config} />)
    expect(wrapper.find('.methodology-section')).toHaveLength(3)
    const text = wrapper.text()
    expect(text).toContain('How scoring works')
    expect(text).toContain('How results are published')
    expect(text).toContain('How shadow verification works')
    wrapper.unmount()
  })

  it('surfaces the live scoring configuration as stats', () => {
    const wrapper = mount(<MethodologyExplainer config={config} />)
    expect(wrapper.find('.methodology-stat')).toHaveLength(4)
    const text = wrapper.text()
    expect(text).toContain('Eligibility cutoff')
    expect(text).toContain('40')
    expect(text).toContain('Max UNL size')
    expect(text).toContain('Churn gap')
    expect(text).toContain('every 4 weeks')
    expect(text).toContain('Minimum score to qualify for the UNL')
    wrapper.unmount()
  })

  it('lists all five dimensions with concise summaries', () => {
    const wrapper = mount(<MethodologyExplainer config={config} />)
    expect(wrapper.find('.methodology-dim')).toHaveLength(5)
    const text = wrapper.text()
    ;['Consensus', 'Reliability', 'Software', 'Diversity', 'Identity'].forEach(
      (dimension) => expect(text).toContain(dimension),
    )
    expect(text).toContain("Agreement with the network's ledgers.")
    wrapper.unmount()
  })

  it('documents the Phase 2 verification chain without the trailing link', () => {
    const wrapper = mount(<MethodologyExplainer config={config} />)
    const text = wrapper.text()
    expect(wrapper.find('.methodology-steps li')).toHaveLength(6)
    expect(text).toContain('Frozen inputs')
    expect(text).toContain('commit before final output hashes are published')
    expect(text).toContain('commit-reveal')
    expect(text).not.toContain('See Independent verification')
    wrapper.unmount()
  })

  it('falls back to dashes when config is unavailable', () => {
    const wrapper = mount(<MethodologyExplainer config={null} />)
    expect(wrapper.find('.methodology-stat')).toHaveLength(4)
    expect(wrapper.text()).toContain('—')
    wrapper.unmount()
  })
})
