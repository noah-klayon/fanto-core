// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/utils/Counters.sol";

import "./libraries/TransferHelper.sol";

contract ZzmCampaign {
    using Counters for Counters.Counter;
    Counters.Counter private campaignIds;

    address _owner;

    // 캠페인 참여 정보
    struct UserInfo {
        uint256 amount;
        string payload; // payload 는 외부에 저장하는 것 검토
    }

    // 캠페인 정보
    struct CampaignInfo {
        uint256 campaignId;
        string symbol;
        address token;
        address creator;
        uint256 amount;
        uint256 count;
        uint256 sold;
        string name;
    }

    CampaignInfo[] public campaignInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    mapping(uint256 => address[]) public campaignAddressesMapping;

    modifier onlyCreator(address creator) {
        require(creator == msg.sender, "Ownable: caller is not the creator");
        _;
    }

    event BuyCampaign(
        address indexed user,
        uint256 indexed campaignId,
        uint256 amount,
        uint256 sold
    );

    event CreateCampaign(
        uint256 campaignId,
        string symbol,
        address token,
        address creator,
        uint256 amount,
        uint256 count,
        string name
    );

    constructor() {
        _owner = msg.sender;
    }

    function campaignLength() external view returns (uint256) {
        return campaignInfo.length;
    }

    function campaigns() external view returns (CampaignInfo[] memory) {
        return campaignInfo;
    }

    // 크리에이터별 캠페인 목록
    function campaignsBySymbol(string memory symbol)
        external
        view
        returns (CampaignInfo[] memory)
    {
        // 배열 size 를 먼저 구한다.
        uint256 size = 0;
        for (uint256 i = 0; i < campaignInfo.length; i++) {
            if (
                keccak256(abi.encodePacked(symbol)) ==
                keccak256(abi.encodePacked(campaignInfo[i].symbol))
            ) {
                size++;
            }
        }

        uint256 index = 0;
        CampaignInfo[] memory campaignInfos = new CampaignInfo[](size);
        for (uint256 i = 0; i < campaignInfo.length; i++) {
            if (
                keccak256(abi.encodePacked(symbol)) ==
                keccak256(abi.encodePacked(campaignInfo[i].symbol))
            ) {
                campaignInfos[index] = campaignInfo[i];
                index++;
            }
        }
        return campaignInfos;
    }

    function campaignById(uint256 campaignId)
        public
        view
        returns (CampaignInfo memory campaign)
    {
        for (uint256 i = 0; i < campaignInfo.length; i++) {
            if (campaignId == campaignInfo[i].campaignId) {
                return campaignInfo[i];
            }
        }
        revert("not found campaign");
    }

    // 특정 캠페인에 참여한 사용자 주소 목록
    function campaignAddresses(uint256 campaignId)
        external
        view
        returns (address[] memory)
    {
        return campaignAddressesMapping[campaignId];
    }

    // 캠페인에 참여한 사용자 목록
    function campaignUsers(uint256 campaignId)
        external
        view
        returns (address[] memory, UserInfo[] memory)
    {
        mapping(address => UserInfo) storage users = userInfo[campaignId];
        address[] memory addresses = campaignAddressesMapping[campaignId];
        UserInfo[] memory userInfos = new UserInfo[](addresses.length);
        for (uint256 i = 0; i < addresses.length; i++) {
            userInfos[i] = users[addresses[i]];
        }
        return (addresses, userInfos);
    }

    // 특정 사용자가 참여한 캠페인 목록
    function myCampaigns(address addr)
        external
        view
        returns (CampaignInfo[] memory)
    {
        // 배열 size 를 먼저 구한다.
        uint256 size = 0;
        for (uint256 i = 0; i < campaignInfo.length; i++) {
            uint256 campaignId = campaignInfo[i].campaignId;
            UserInfo memory user = userInfo[campaignId][addr];
            if (user.amount > 0) {
                size++;
            }
        }

        uint256 index = 0;
        CampaignInfo[] memory campaignInfos = new CampaignInfo[](size);
        for (uint256 i = 0; i < campaignInfo.length; i++) {
            uint256 campaignId = campaignInfo[i].campaignId;
            UserInfo memory user = userInfo[campaignId][addr];
            if (user.amount > 0) {
                campaignInfos[index++] = campaignInfo[i];
            }
        }
        return campaignInfos;
    }

    // 참여한 캠페인
    function myCampaign(uint256 campaignId, address addr)
        public
        view
        returns (UserInfo memory)
    {
        UserInfo memory user = userInfo[campaignId][addr];
        return user;
    }

    // 캠페인 등록
    function add(
        string memory symbol,
        address token,
        address creator,
        string memory name,
        uint256 amount,
        uint256 count
    ) public onlyCreator(creator) {
        // count 는 0보다 커야함
        require(count > 0, "ZzmCampaign: INVALID_COUNT");

        campaignIds.increment();

        uint256 newCampaignId = campaignIds.current();

        campaignInfo.push(
            CampaignInfo({
                campaignId: newCampaignId,
                symbol: symbol,
                token: token,
                creator: creator,
                amount: amount,
                count: count,
                sold: 0,
                name: name
            })
        );

        emit CreateCampaign(
            newCampaignId,
            symbol,
            token,
            creator,
            amount,
            count,
            name
        );
    }

    // 캠페인 참여
    function buyCampaign(
        uint256 campaignId,
        uint256 amount,
        string memory payload
    ) public {
        CampaignInfo memory campaign = campaignById(campaignId);
        // 구매 횟수 체크
        require(campaign.count > campaign.sold, "ZzmCampaign: SOLD_OUT");
        // amount가 충분한지 체크
        require(amount == campaign.amount, "ZzmCampaign: INSUFFICIENT_AMOUNT");
        // 이미 참여한 사용자인지 체크
        UserInfo memory user = myCampaign(campaignId, msg.sender);
        require(user.amount == 0, "ZzmCampaign: ALREADY_BOUGHT");

        // 캠페인 상태 변수 업데이트
        UserInfo storage newUser = userInfo[campaignId][msg.sender];
        newUser.amount = amount;
        newUser.payload = payload;
        address[] storage addresses = campaignAddressesMapping[campaignId];
        addresses.push(msg.sender);

        // 토큰 전송
        TransferHelper.safeTransferFrom(
            campaign.token,
            msg.sender,
            campaign.creator,
            amount
        );

        // 캠페인 sold 수량 업데이트
        uint256 sold = 0;
        for (uint256 i = 0; i < campaignInfo.length; i++) {
            if (campaignId == campaignInfo[i].campaignId) {
                campaignInfo[i].sold = campaignInfo[i].sold + 1;
                sold = campaignInfo[i].sold;
                break;
            }
        }
        emit BuyCampaign(msg.sender, campaignId, amount, sold);
    }
}
