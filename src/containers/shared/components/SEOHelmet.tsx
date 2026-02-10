import { FC } from 'react'
import { Helmet } from 'react-helmet-async'

interface Breadcrumb {
  name: string
  path: string
}

interface SEOHelmetProps {
  title: string
  description?: string
  path?: string
  type?: string
  breadcrumbs?: Breadcrumb[]
}

const BASE_URL_BY_ENV: Record<string, string> = {
  mainnet: 'https://explorer.postfiat.org',
  testnet: 'https://explorer.testnet.postfiat.org',
  devnet: 'https://explorer.devnet.postfiat.org',
}

const baseUrl =
  BASE_URL_BY_ENV[process.env.VITE_ENVIRONMENT || 'mainnet'] ||
  BASE_URL_BY_ENV.mainnet

export const SEOHelmet: FC<SEOHelmetProps> = ({
  title,
  description,
  path,
  type = 'website',
  breadcrumbs,
}) => {
  const fullUrl = path ? `${baseUrl}${path}` : undefined
  const breadcrumbLd =
    breadcrumbs && breadcrumbs.length > 0
      ? JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: `${baseUrl}${crumb.path}`,
          })),
        })
      : undefined

  return (
    <Helmet title={title}>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      {fullUrl && <meta property="og:url" content={fullUrl} />}
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      {breadcrumbLd && (
        <script type="application/ld+json">{breadcrumbLd}</script>
      )}
    </Helmet>
  )
}
