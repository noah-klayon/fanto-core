NETWORK=baobab

npx hardhat run scripts/deploy_campaign.ts --network $NETWORK

# for development
npx hardhat run scripts/add_sample_campaigns.ts --network $NETWORK
