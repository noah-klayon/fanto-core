if [ $# -eq 0 ]
then
    echo "Usage: $0 <TOKEN_SYMBOL>"
    exit
fi

NETWORK=baobab

TOKEN=$1 npx hardhat run scripts/transfer_token.ts --network $NETWORK
