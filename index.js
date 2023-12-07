const { ECDSAProvider } = require('@zerodev/sdk');
const { LocalAccountSigner } = require("@alchemy/aa-core");
const { encodeFunctionData, parseAbi, createPublicClient, http } = require('viem');
const { polygonMumbai } = require('viem/chains');
require('dotenv').config();

if (!process.env.PRIVATE_KEY || !process.env.PROJECT_ID) {
  console.log('Please set private key and project ID as environment variables');
  process.exit(1);
}

// ZeroDev Project ID
const projectId = process.env.PROJECT_ID;

// The "owner" of the AA wallet, which in this case is a private key
const owner = LocalAccountSigner.privateKeyToAccountSigner(process.env.PRIVATE_KEY);

// The NFT contract we will be interacting with
const contractAddress = '0x34bE7f35132E97915633BC1fc020364EA5134863';
const contractABI = parseAbi([
  'function mint(address _to) public',
  'function balanceOf(address owner) external view returns (uint256 balance)'
]);
const publicClient = createPublicClient({
  chain: polygonMumbai,
  // the API is rate limited and for demo purposes only
  // in production, replace this with your own node provider (e.g. Infura/Alchemy)
  transport: http(process.env.RPC_URL || 'https://rpc-mumbai.maticvigil.com'),
});

const main = async () => {
  // Create the AA wallet
  const ecdsaProvider = await ECDSAProvider.init({
    projectId,
    owner,
  });
  const address = await ecdsaProvider.getAddress();
  console.log('My address:', address);

  // Mint the NFT
  const userOp = {
    target: contractAddress,
    data: encodeFunctionData({
      abi: contractABI,
      functionName: 'mint',
      args: [address],
    }),
  };

  // const { hash } = await ecdsaProvider.sendUserOperation(userOp);

  // bundle transactions together
  const { hash } = await ecdsaProvider.sendUserOperation([userOp, userOp]);
  console.log("Mint Tx Submitted. Waiting for confirmation", hash);

  await ecdsaProvider.waitForUserOperationTransaction(hash);
  console.log("Mint Tx Confirmed.");

  // Check how many NFTs we have
  const balanceOf = await publicClient.readContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'balanceOf',
    args: [address],
  });
  console.log(`NFT balance: ${balanceOf}`);
};

main().then(() => process.exit(0));