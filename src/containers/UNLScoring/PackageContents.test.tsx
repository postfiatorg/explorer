import { mount } from 'enzyme'
import { PackageContents, groupPackageFiles } from './PackageContents'
import { usePackageManifest } from './usePackageManifest'

jest.mock('./usePackageManifest', () => ({
  __esModule: true,
  usePackageManifest: jest.fn(),
}))

const CID = 'QmTestPackageCid'

const manifest = (fileHashes: Record<string, string>) => ({
  file_hashes: fileHashes,
})

const FILE_HASHES = {
  'inputs/model_request.json': 'a'.repeat(64),
  'inputs/validator_evidence.json': 'b'.repeat(64),
  'outputs/validator_scores.json': 'c'.repeat(64),
  'runtime/execution_manifest.json': 'd'.repeat(64),
  'raw/vhs_validators.json': 'e'.repeat(64),
}

describe('groupPackageFiles', () => {
  it('orders known groups by pipeline stage and sorts files within a group', () => {
    const groups = groupPackageFiles({
      'raw/vhs_validators.json': 'e'.repeat(64),
      'outputs/validator_scores.json': 'c'.repeat(64),
      'outputs/model_response.json': 'f'.repeat(64),
      'inputs/model_request.json': 'a'.repeat(64),
      'runtime/execution_manifest.json': 'd'.repeat(64),
    })

    expect(groups.map((g) => g.label)).toEqual([
      'inputs',
      'outputs',
      'runtime',
      'raw',
    ])
    expect(groups[1].files.map((f) => f.name)).toEqual([
      'model_response.json',
      'validator_scores.json',
    ])
  })

  it('renders unknown groups after known ones and ungrouped files first', () => {
    const groups = groupPackageFiles({
      'attestations/quorum.json': 'a'.repeat(64),
      'inputs/model_request.json': 'b'.repeat(64),
      'notes.txt': 'c'.repeat(64),
    })

    expect(groups.map((g) => g.label)).toEqual(['', 'inputs', 'attestations'])
    expect(groups[0].files[0].path).toBe('notes.txt')
  })
})

describe('PackageContents', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the manifest row, grouped rows, and footer from file_hashes', () => {
    ;(usePackageManifest as jest.Mock).mockReturnValue(manifest(FILE_HASHES))

    const wrapper = mount(<PackageContents cid={CID} />)

    // 5 hashed files + the pinned manifest row
    expect(wrapper.find('summary').text()).toContain('Package contents')
    expect(wrapper.find('summary').text()).toContain('6 files')

    const rows = wrapper.find('a.pkg-row')
    expect(rows).toHaveLength(6)
    expect(rows.first().prop('href')).toBe(`/ipfs/${CID}/bundle.json`)
    expect(rows.first().find('.pkg-row-manifest-tag').text()).toBe('manifest')

    expect(wrapper.find('.pkg-group').map((group) => group.text())).toEqual([
      'inputs',
      'outputs',
      'runtime',
      'raw',
    ])

    const scoresRow = rows.filterWhere(
      (row) =>
        row.prop('href') === `/ipfs/${CID}/outputs/validator_scores.json`,
    )
    expect(scoresRow.find('.pkg-row-path').text()).toBe('validator_scores.json')
    expect(scoresRow.find('.pkg-row-hash').prop('title')).toBe('c'.repeat(64))
    expect(scoresRow.find('.pkg-row-hash').text()).toBe('cccccc…cccc')

    expect(wrapper.find('.pkg-foot a').prop('href')).toBe(
      `https://gateway.pinata.cloud/ipfs/${CID}`,
    )
    expect(wrapper.find('.pkg-foot').text()).toContain('Browse raw directory')

    // grouped rows are indented beneath their stage label; the manifest row
    // stays at the outer edge
    expect(wrapper.find('a.pkg-row.pkg-row-grouped')).toHaveLength(5)
    expect(rows.first().hasClass('pkg-row-grouped')).toBe(false)

    wrapper.unmount()
  })

  it('renders footer children after the raw-directory link', () => {
    ;(usePackageManifest as jest.Mock).mockReturnValue(manifest(FILE_HASHES))

    const wrapper = mount(
      <PackageContents cid={CID}>
        <button type="button" className="audit-gateway-alt">
          Download vl.json
        </button>
      </PackageContents>,
    )

    expect(wrapper.find('.pkg-foot').text()).toContain('Download vl.json')

    wrapper.unmount()
  })

  it('falls back to plain links when the manifest is unavailable or still loading', () => {
    ;(usePackageManifest as jest.Mock).mockReturnValue(null)

    const wrapper = mount(
      <PackageContents cid={CID}>
        <button type="button" className="audit-gateway-alt">
          Download vl.json
        </button>
      </PackageContents>,
    )

    expect(wrapper.find('details').exists()).toBe(false)
    expect(wrapper.find('a.audit-gateway-link').prop('href')).toBe(
      `/ipfs/${CID}/bundle.json`,
    )
    expect(wrapper.text()).toContain('View manifest')
    expect(wrapper.find('a.audit-gateway-alt').prop('href')).toBe(
      `https://dweb.link/ipfs/${CID}/bundle.json`,
    )
    expect(wrapper.text()).toContain('Open on public gateway')
    expect(wrapper.text()).toContain('Download vl.json')

    wrapper.unmount()
  })

  it('falls back to plain links when the manifest has no file hashes', () => {
    ;(usePackageManifest as jest.Mock).mockReturnValue(manifest({}))

    const wrapper = mount(<PackageContents cid={CID} />)

    expect(wrapper.find('details').exists()).toBe(false)
    expect(wrapper.text()).toContain('View manifest')

    wrapper.unmount()
  })
})
