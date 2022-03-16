if [ $# -eq 0 ]
then
    echo "Usage: $0 <TOKEN_SYMBOL>"
    exit
fi

NETWORK=baobab

TOKEN=$1 npx hardhat run scripts/deploy_token.ts --network $NETWORK
TOKEN=$1 npx hardhat run scripts/add_liquidity.ts --network $NETWORK
TOKEN=$1 npx hardhat run scripts/add_to_farm.ts --network $NETWORK
