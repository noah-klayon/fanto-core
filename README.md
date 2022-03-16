ERC20 토큰 발행하여 지갑 연결하여 보여주기 데모 

# 환경설정 
- .env 의 REACT_APP_PRIVATE_KEY 를 실제 개인키로 세팅 필요 
```
REACT_APP_PRIVATE_KEY=0x
```

# ERC20 smart contract
- contracts/KToken.sol 을 수정해서 사용하면 됨
- 업그레이드 가능한 컨트랙트로 작성할 경우 contracts/UpgradableKToken.sol 을 수정해서 사용하면 됨 (자세한 내용은 emjay 에게 문의할 것) 

# run
```
npm install
npm install ethers@5.0.32
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network baobab
```

# 초기화 후 다시 시작시 단계별 세팅 
```
npm init --yes
npm install --save-dev hardhat
npm install --save-dev @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-waffle ethereum-waffle chai
npm install @openzeppelin/contracts
npm install @openzeppelin/contracts-upgradeable
npm install ethers@5.0.32		# 버전 문제로 낮춰야 된다고 함 
npm install hardhat-klaytn-patch
npm install --save-dev @openzeppelin/hardhat-upgrades
npm install dotenv
```
- .env 의 REACT_APP_PRIVATE_KEY 를 실제 개인키로 세팅 필요 
- 버전 문제로 ethers 의 버전은 5.0.32 여야 됨. rpm audit fix 를 하면 되돌아 가므로 ethers@5.0.32 를 다시 설치하면 됨 

# 주요 컨트랙트 배포
- WKLAY, ZzmFactory, ZzmPair, ZzmRouter, ZzmFarm, FTN 컨트랙트 배포 
```
> sh scripts/run_deploy_all.sh 
```
- scripts/contracts 에 contract-address.json 파일 생성됨. 필요한 시점에 frontend/src/contracts 로 복사해서 사용

# Router 업데이트
- ZzmRouter 컨트랙트 업데이트 배포
```
> sh scripts/run_deploy_router.sh 
```
- scripts/contracts 에 contract-address.json 파일 생성됨. 필요한 시점에 frontend/src/contracts 로 복사해서 사용
- 기존에 생성되어 있던 TOKEN 들에 대해 approve 도 처리됨

# 개별 토큰 배포 및 유동성 추가
```
> sh scripts/run_deploy_token.sh <TOKEN_SYMBOL>
```
- 토큰이 생성되고 유동성도 함께 추가됨
- scripts/contracts 에 contract-address.json 파일 생성됨. 필요한 시점에 frontend/src/contracts 로 복사해서 사용

# 테스트 토큰 전송
```
> sh scripts/run_transfer_token.sh <TOKEN_SYMBOL>
```
- 개발자에게 토큰 전송

# upgrade 가능한 버전의 smart contract 의 배포 (참고용) 
```
> npx hardhat run scripts/upgrade/deploy.js --network baobab
> npx hardhat run scripts/upgrade/upgrade.js --network baobab
```

실행결과 예제 
```
Deploying contracts with the account: 0x2eDA5B1abD38B3915939791a5ee3E788935C4697
Account balance: 105221602075000000000
Token address: 0x4Bcfb9fc5a291e550cc9213D6EaD397f3CC1A4dD
```

# 컨트랙트 배포 결과 확인 
https://baobab.scope.klaytn.com/token/0x4bcfb9fc5a291e550cc9213d6ead397f3cc1a4dd?tabId=tokenTransfer

# frontend run
```
cd frontend
> npm install
> npm start
```

# ZzmPair 에 대한 init code hash 값 생성
```
$ npx hardhat run scripts/utils/generate_initcodehash.js
```
