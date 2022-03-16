/**
 * ZzmPair 의 bytecode 에 대한 keccak256 해시를 구해 출력한다.
 * ZzmLibrary 의 pairFor 함수에서 pair 주소를 생성할 때 사용된다.
 *
 * 실행방법:
 * $ node scripts/utils/generate_initcodehash.js
 *
 * 참고:
 * https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol#L24
 */
const solidity = require("@ethersproject/solidity");
const ZzmPair = require("../../artifacts/contracts/ZzmPair.sol/ZzmPair.json");

async function main() {
  const bytecode = ZzmPair.bytecode;
  const initCodeHash = solidity
    .keccak256(["bytes"], [`${bytecode}`])
    .toString("hex");
  console.log(initCodeHash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
