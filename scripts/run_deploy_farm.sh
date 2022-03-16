NETWORK=baobab

#npx hardhat run scripts/deploy_farm.ts --network $NETWORK

# For development
TOKEN=RYVG npx hardhat run scripts/add_to_farm.ts --network $NETWORK
TOKEN=KBT npx hardhat run scripts/add_to_farm.ts --network $NETWORK
TOKEN=UNQT npx hardhat run scripts/add_to_farm.ts --network $NETWORK
