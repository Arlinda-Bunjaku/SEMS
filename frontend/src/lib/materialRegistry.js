import { BrowserProvider, Contract } from 'ethers'

const CONTRACT_ADDRESS = '0xb33d53c2bd2c92dabc255f273d651fe498ff1dc8'
const POLYGON_AMOY_CHAIN_ID = '0x13882'

const CONTRACT_ABI = [
  'function registerMaterial(bytes32 materialId, string title, bytes32 contentHash)',
  'function getMaterial(bytes32 materialId) view returns (address professor, string title, bytes32 contentHash, uint256 createdAt, bool exists)',
  'event MaterialRegistered(bytes32 indexed materialId, address indexed professor, string title, bytes32 contentHash, uint256 createdAt)',
]

export async function connectMaterialRegistry() {
  if (!window.ethereum) {
    throw new Error('MetaMask nuk u gjet në shfletues.')
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' })

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
    })
  } catch (error) {
    if (error.code === 4902) {
      throw new Error(
        'Polygon Amoy nuk është shtuar në MetaMask. Shtoje rrjetin dhe provo përsëri.'
      )
    }
    throw error
  }

  const provider = new BrowserProvider(window.ethereum)
  const network = await provider.getNetwork()

  if (network.chainId !== 80002n) {
    throw new Error('Zgjidh Polygon Amoy në MetaMask.')
  }

  const code = await provider.getCode(CONTRACT_ADDRESS)
  if (code === '0x') {
    throw new Error(
      'Nuk u gjet kontratë në këtë adresë në Polygon Amoy. Kontrollo Contract Address në Explorer.'
    )
  }

  const signer = await provider.getSigner()
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

  return {
    contract,
    address: await signer.getAddress(),
  }
}