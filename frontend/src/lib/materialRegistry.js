import { BrowserProvider, Contract } from 'ethers'

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
const LOCAL_CHAIN_ID = '0x7a69'

const CONTRACT_ABI = [
  'function registerMaterial(bytes32 materialId, string title, bytes32 contentHash)',
  'function getMaterial(bytes32 materialId) view returns (address professor, string title, bytes32 contentHash, uint256 createdAt, bool exists)',
  'event MaterialRegistered(bytes32 indexed materialId, address indexed professor, string title, bytes32 contentHash, uint256 createdAt)',
]

export async function connectMaterialRegistry() {
  if (!window.ethereum) {
    throw new Error('MetaMask nuk u gjet në shfletues.')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: LOCAL_CHAIN_ID }],
    })
  } catch (error) {
    if (error.code !== 4902) {
      throw error
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: LOCAL_CHAIN_ID,
        chainName: 'Hardhat Local',
        rpcUrls: ['http://127.0.0.1:8545'],
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18,
        },
      }],
    })
  }

  await window.ethereum.request({
    method: 'eth_requestAccounts',
  })

  const provider = new BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)

  return {
    contract,
    address: await signer.getAddress(),
  }
}