import { FC, Fragment, ReactNode } from 'react'
import {
  BUNDLE_MANIFEST_FILE,
  PINATA_PUBLIC_GATEWAY_HOST,
  PUBLIC_IPFS_GATEWAY_HOST,
  ipfsGatewayUrl,
  ipfsProxyUrl,
} from '../Network/scoringUtils'
import { usePackageManifest } from './usePackageManifest'

// Pipeline-stage order for the grouped file list. Groups the manifest may grow
// in the future render after these, alphabetically, so the component never
// hides a file it does not recognize.
const GROUP_ORDER = ['inputs', 'outputs', 'runtime', 'raw']

const HASH_PREFIX_LENGTH = 6
const HASH_SUFFIX_LENGTH = 4

interface PackageFile {
  path: string
  name: string
  hash: string
}

interface PackageGroup {
  label: string
  files: PackageFile[]
}

const shortenSha256 = (hash: string): string =>
  hash.length > HASH_PREFIX_LENGTH + HASH_SUFFIX_LENGTH + 1
    ? `${hash.slice(0, HASH_PREFIX_LENGTH)}…${hash.slice(-HASH_SUFFIX_LENGTH)}`
    : hash

export const groupPackageFiles = (
  fileHashes: Record<string, string>,
): PackageGroup[] => {
  const byGroup = new Map<string, PackageFile[]>()
  Object.entries(fileHashes).forEach(([path, hash]) => {
    // The manifest is fetched data; a malformed entry drops its row rather
    // than crashing the whole audit panel.
    if (typeof hash !== 'string') return
    const slash = path.indexOf('/')
    const label = slash === -1 ? '' : path.slice(0, slash)
    const name = slash === -1 ? path : path.slice(slash + 1)
    const files = byGroup.get(label) ?? []
    files.push({ path, name, hash })
    byGroup.set(label, files)
  })

  const known = GROUP_ORDER.filter((label) => byGroup.has(label))
  const unknown = [...byGroup.keys()]
    .filter((label) => label !== '' && !GROUP_ORDER.includes(label))
    .sort()
  const ungrouped = byGroup.has('') ? [''] : []

  return [...ungrouped, ...known, ...unknown].map((label) => ({
    label,
    files: (byGroup.get(label) as PackageFile[]).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  }))
}

const FileRow: FC<{ cid: string; file: PackageFile; grouped: boolean }> = ({
  cid,
  file,
  grouped,
}) => (
  <a
    className={grouped ? 'pkg-row pkg-row-grouped' : 'pkg-row'}
    href={ipfsProxyUrl(cid, file.path)}
    target="_blank"
    rel="noopener noreferrer"
  >
    <span className="pkg-row-path">{file.name}</span>
    <span className="pkg-row-tail">
      <span className="pkg-row-hash" title={file.hash}>
        {shortenSha256(file.hash)}
      </span>
      <span className="pkg-row-open" aria-hidden="true">
        ↗
      </span>
    </span>
  </a>
)

// Plain links shown while the manifest is loading and when it cannot be
// fetched at all. The public gateway link lives only here: when the explorer's
// own /ipfs path is failing, it is the one link that does not depend on it.
const FallbackLinks: FC<{ cid: string; children?: ReactNode }> = ({
  cid,
  children,
}) => (
  <div className="audit-trail-links">
    <a
      className="audit-gateway-link"
      href={ipfsProxyUrl(cid, BUNDLE_MANIFEST_FILE)}
      target="_blank"
      rel="noopener noreferrer"
    >
      View manifest
    </a>
    <a
      className="audit-gateway-alt"
      href={ipfsGatewayUrl(PUBLIC_IPFS_GATEWAY_HOST, cid, BUNDLE_MANIFEST_FILE)}
      target="_blank"
      rel="noopener noreferrer"
    >
      Open on public gateway
    </a>
    {children}
  </div>
)

interface PackageContentsProps {
  cid: string
  // Extra footer actions (e.g. the outputs card's vl.json download button).
  children?: ReactNode
}

// In-explorer inventory of a pinned package, built from its own bundle.json
// manifest so browsing never depends on a gateway's directory-listing page.
// Every file opens through the /ipfs proxy; the manifest itself is pinned as
// the first row since it cannot appear in its own file_hashes.
export const PackageContents: FC<PackageContentsProps> = ({
  cid,
  children,
}) => {
  const manifest = usePackageManifest(cid)
  const groups = groupPackageFiles(manifest?.file_hashes ?? {})
  const hashedFileCount = groups.reduce(
    (count, group) => count + group.files.length,
    0,
  )

  if (hashedFileCount === 0) {
    return <FallbackLinks cid={cid}>{children}</FallbackLinks>
  }

  // The hashed files plus the manifest row itself.
  const fileCount = hashedFileCount + 1

  return (
    <details className="pkg-contents">
      <summary className="pkg-summary">
        <span className="pkg-summary-chevron" aria-hidden="true">
          ▶
        </span>
        Package contents
        <span className="pkg-summary-count">· {fileCount} files</span>
      </summary>
      <div className="pkg-file-list">
        <a
          className="pkg-row"
          href={ipfsProxyUrl(cid, BUNDLE_MANIFEST_FILE)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="pkg-row-path">{BUNDLE_MANIFEST_FILE}</span>
          <span className="pkg-row-tail">
            <span className="pkg-row-manifest-tag">manifest</span>
            <span className="pkg-row-open" aria-hidden="true">
              ↗
            </span>
          </span>
        </a>
        {groups.map((group) => (
          <Fragment key={group.label || 'ungrouped'}>
            {group.label && <div className="pkg-group">{group.label}</div>}
            {group.files.map((file) => (
              <FileRow
                key={file.path}
                cid={cid}
                file={file}
                grouped={Boolean(group.label)}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <div className="pkg-foot">
        <a
          className="audit-gateway-alt"
          href={ipfsGatewayUrl(PINATA_PUBLIC_GATEWAY_HOST, cid)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Browse raw directory
        </a>
        {children}
      </div>
    </details>
  )
}
