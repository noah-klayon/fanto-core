#
# deploy WKLAY, ZzmFactory, ZzmPair
# deploy ZzmRouter
# deploy FTN and add liquidity (WKLAY-FTN pool)
# deploy ZzmFarm
#

NETWORK=baobab

npx hardhat run scripts/deploy_core.ts --network $NETWORK
npx hardhat run scripts/deploy_router.ts --network $NETWORK
TOKEN=FTN npx hardhat run scripts/deploy_token.ts --network $NETWORK
TOKEN=FTN npx hardhat run scripts/add_liquidity.ts --network $NETWORK
npx hardhat run scripts/deploy_farm.ts --network $NETWORK
