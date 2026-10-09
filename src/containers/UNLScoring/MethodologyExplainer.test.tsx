import { mount } from 'enzyme'
import { MethodologyExplainer } from './MethodologyExplainer'
import type { RoundScoringConfig, ScoringConfig } from '../Network/scoringUtils'

const config: ScoringConfig = {
  cadence_hours: 672,
  unl_score_cutoff: 40,
  unl_max_size: 3,
  unl_min_score_gap: 5,
}

describe('MethodologyExplainer', () => {
  it('renders the three sections', () => {
    const wrapper = mount(
      <MethodologyExplainer config={config} roundConfig={null} />,
    )
    expect(wrapper.find('.methodology-section')).toHaveLength(3)
    const text = wrapper.text()
    expect(text).toContain('How scoring works')
    expect(text).toContain('How results are published')
    expect(text).toContain("How it's independently verified")
    wrapper.unmount()
  })

  const formulaConfig: ScoringConfig = {
    ...config,
    score_formula: {
      version: 1,
      weights: {
        consensus: 50,
        reliability: 20,
        software: 10,
        diversity: 10,
        identity: 10,
      },
      consensus_gate_margin: 25,
    },
  }

  const diversityRoundConfig: RoundScoringConfig = {
    diversity_formula: {
      version: 1,
      axis_points: 50,
      axis_penalty: 119,
      unknown_axis_points: 10,
    },
  }

  it('renders the deterministic formula when the config publishes it', () => {
    const wrapper = mount(
      <MethodologyExplainer config={formulaConfig} roundConfig={null} />,
    )
    const formula = wrapper.find('.methodology-formula')
    expect(formula.exists()).toBe(true)
    const text = formula.text()
    expect(text).toContain('deterministic and published')
    expect(text).toContain('Consensus 50%')
    expect(text).toContain('Reliability 20%')
    expect(text).toContain(
      'plus 25; and the selection applies the cutoff, size and churn gap above.',
    )
    expect(text).not.toContain('diversity sub-score')
    wrapper.unmount()
  })

  it('folds the computed diversity clause into the formula when the manifest pins it', () => {
    const wrapper = mount(
      <MethodologyExplainer
        config={formulaConfig}
        roundConfig={diversityRoundConfig}
      />,
    )
    expect(wrapper.find('.methodology-formula')).toHaveLength(1)
    const text = wrapper.find('.methodology-formula').text()
    expect(text).toContain(
      'plus 25; the diversity sub-score comes from two counts, the validators in the round sharing its country and the validators sharing its hosting provider family, with a fixed value when the location is unknown; and the selection applies',
    )
    expect(text).not.toContain('119')
    wrapper.unmount()
  })

  it('omits the formula section when the config predates it', () => {
    const wrapper = mount(
      <MethodologyExplainer
        config={config}
        roundConfig={diversityRoundConfig}
      />,
    )
    expect(wrapper.find('.methodology-formula').exists()).toBe(false)
    wrapper.unmount()
  })

  it('tags only the Diversity dimension as computed when the manifest pins the formula', () => {
    const wrapper = mount(
      <MethodologyExplainer
        config={config}
        roundConfig={diversityRoundConfig}
      />,
    )
    const tags = wrapper.find('.methodology-dim-tag')
    expect(tags).toHaveLength(1)
    expect(tags.text()).toBe('computed')
    expect(tags.closest('.methodology-dim').text()).toContain('Diversity')
    wrapper.unmount()
  })

  it('omits the computed tag when the manifest predates the formula', () => {
    const wrapper = mount(
      <MethodologyExplainer
        config={config}
        roundConfig={{ excluded_validator_server_versions: ['3.0.0'] }}
      />,
    )
    expect(wrapper.find('.methodology-dim-tag').exists()).toBe(false)
    wrapper.unmount()
  })

  it('surfaces the live scoring configuration as stats', () => {
    const wrapper = mount(
      <MethodologyExplainer config={config} roundConfig={null} />,
    )
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
    const wrapper = mount(
      <MethodologyExplainer config={config} roundConfig={null} />,
    )
    expect(wrapper.find('.methodology-dim')).toHaveLength(5)
    const text = wrapper.text()
    ;['Consensus', 'Reliability', 'Software', 'Diversity', 'Identity'].forEach(
      (dimension) => expect(text).toContain(dimension),
    )
    expect(text).toContain("Agreement with the network's ledgers.")
    wrapper.unmount()
  })

  it('documents the Phase 2 verification chain without the trailing link', () => {
    const wrapper = mount(
      <MethodologyExplainer config={config} roundConfig={null} />,
    )
    const text = wrapper.text()
    expect(wrapper.find('.methodology-steps li')).toHaveLength(6)
    expect(text).toContain('Inputs frozen first')
    expect(text).toContain('after the commit window closes')
    expect(text).toContain('commit before final output hashes are published')
    expect(text).toContain('commit-reveal')
    expect(text).not.toContain('See Independent verification')
    wrapper.unmount()
  })

  it('falls back to dashes when config is unavailable', () => {
    const wrapper = mount(
      <MethodologyExplainer config={null} roundConfig={null} />,
    )
    expect(wrapper.find('.methodology-stat')).toHaveLength(4)
    expect(wrapper.text()).toContain('—')
    wrapper.unmount()
  })
})
