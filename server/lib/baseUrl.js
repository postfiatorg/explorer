const BASE_URL_BY_ENV = {
  mainnet: 'https://explorer.postfiat.org',
  testnet: 'https://explorer.testnet.postfiat.org',
  devnet: 'https://explorer.devnet.postfiat.org',
}

const ENV_BASE_URL_BY_ENV = {
  mainnet: process.env.VITE_MAINNET_LINK,
  testnet: process.env.VITE_TESTNET_LINK,
  devnet: process.env.VITE_DEVNET_LINK,
  xahau_mainnet: process.env.VITE_XAHAU_MAINNET_LINK,
  xahau_testnet: process.env.VITE_XAHAU_TESTNET_LINK,
  custom: process.env.VITE_CUSTOMNETWORK_LINK,
}

function getBaseUrl() {
  const env = process.env.VITE_ENVIRONMENT || 'mainnet'
  const url =
    ENV_BASE_URL_BY_ENV[env] || BASE_URL_BY_ENV[env] || BASE_URL_BY_ENV.mainnet
  return url ? url.replace(/\/$/, '') : url
}

module.exports = { getBaseUrl }
