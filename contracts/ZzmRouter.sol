pragma solidity =0.6.6;
//pragma solidity ^0.8.0;

import './interfaces/IERC20.sol';

import './interfaces/IZzmFactory.sol';
import './interfaces/IZzmRouter.sol';
import './interfaces/IWETH.sol';

import './libraries/TransferHelper.sol';
import './libraries/ZzmLibrary.sol';
import './libraries/SafeMath.sol';

import 'hardhat/console.sol';

contract ZzmRouter is IZzmRouter {
    using SafeMath for uint;

    address public immutable override factory;
    address public immutable override WETH;

    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'ZzmRouter: EXPIRED');
        _;
    }

    constructor(address _factory, address _WETH) public {
        factory = _factory;
        WETH = _WETH;
    }

    receive() external payable {
        assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
    }

    // **** BUY TOKEN: ETH, Fanto TOKEN ****
    function buyTokenByETH(
        address[] calldata path, // 0 = wklay, 1 = zzm, 2 = socialToken
        address toOfLiquidity, // system account address
        address toOfToken, // user account address
        uint deadline
    ) external virtual override payable ensure(deadline) returns (uint amountA, uint amountB, uint liquidity, uint amountToken) {
        // 유동성을 system account 소유로 공급
        (amountA, amountB, liquidity) = _swapETHAndAddLiquidity(path, toOfLiquidity);

        // token을 유저(= msg.sender) 에게 발행
        uint[] memory amounts = ZzmLibrary.getAmountsOut(factory, msg.value, path);
        amountToken = amounts[2];
        TransferHelper.safeTransferFrom(path[2], toOfLiquidity, toOfToken, amountToken);
    }

    function buyToken(
        uint amount,
        address[] calldata path, // 0 = FT, 1 = socialToken
        address toOfLiquidity,
        address toOfToken,
        uint deadline
    ) external virtual override payable ensure(deadline) returns (uint amountA, uint amountB, uint liquidity, uint amountToken) {
        address[] memory tempPath = path;
        TransferHelper.safeTransferFrom(tempPath[0], msg.sender, toOfLiquidity, amount);

        uint[] memory amounts = _swapZzmForSocialTokens(amount, tempPath, toOfLiquidity);
        (amountA, amountB, liquidity) = _addLiquidityForZzm(tempPath, toOfLiquidity, amounts[0], amounts[1]);

        amounts = ZzmLibrary.getAmountsOut(factory, amount, tempPath);
        amountToken = amounts[1];
        TransferHelper.safeTransferFrom(path[1], toOfLiquidity, toOfToken, amountToken);
    }

    // **** ADD LIQUIDITY: ETH, Fanto TOKEN, SOCIAL TOKEN ****
    function swapETHAndAddLiquidity(
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override payable ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        (amountA, amountB, liquidity) = _swapETHAndAddLiquidity(path, to);
    }

    function _swapETHAndAddLiquidity(
        address[] memory path,
        address to
    ) internal returns (uint amountA, uint amountB, uint liquidity) {
        // step1 : eth를 모두 zzm으로 swap
        // - swapExactETHForTokens 를 사용해서 token(=zzm)을 얻어 낸다.
        address[] memory tempPath = new address[](2);
        tempPath[0] = path[0]; // wklay
        tempPath[1] = path[1]; // zzm
        uint zzmBalance = _swapETHForZzmTokens(msg.value, tempPath, to); // klay에서 swap된 zzm의 개수

        // step2 : zzm의 일부를 token으로 swap
        // - zzm-token 풀에 대한 reserve 가져온다.
        //   - (uint reserveA, uint reserveB) = ZzmLibrary.getReserves(factory, tokenA, tokenB);
        // - reserve를 바탕으로 위에서 얻어낸 zzm 수량 중 일부를 token으로 swap 한다.
        tempPath[0] = path[1]; // zzm
        tempPath[1] = path[2]; // socialToken
        uint[] memory amounts = _swapZzmForSocialTokens(zzmBalance, tempPath, to);

        // step3: zzm-token 풀에 유동성 공급
        (amountA, amountB, liquidity) = _addLiquidityForZzm(tempPath, to, amounts[0], amounts[1]);
    }

    // swapExactETHForTokens
    function _swapETHForZzmTokens(
        uint amount,
        address[] memory path,
        address to
    ) internal returns (uint amountOut){
        uint[] memory amounts = ZzmLibrary.getAmountsOut(factory, amount, path);
        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(ZzmLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
        amountOut = amounts[1];
    }

    // swapExactTokensForTokens
    function _swapZzmForSocialTokens(
        uint amount,
        address[] memory path,
        address to
    ) internal returns (uint[] memory amounts) {
        uint amountIn = amount / 2;
        amounts = ZzmLibrary.getAmountsOut(factory, amountIn, path);
        TransferHelper.safeTransferFrom(
            path[0], to, ZzmLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }

    function _addLiquidityForZzm(
        address[] memory path,
        address from,
        uint amountADesired,
        uint amountBDesired
    ) internal returns (uint amountA, uint amountB, uint liquidity) {
        // 내가 가지고 있는 잔액하고 비교 해서 바꾸기
        uint balanceOfA = IERC20(path[0]).balanceOf(from);
        uint balanceOfB = IERC20(path[1]).balanceOf(from);
        uint optimalAmountA = amountADesired;
        uint optimalAmountB = amountBDesired;
        if (amountADesired > balanceOfA) optimalAmountA = balanceOfA;
        if (amountBDesired > balanceOfB) optimalAmountB = balanceOfB;
        (amountA, amountB) = _addLiquidity(path[0], path[1], optimalAmountA, optimalAmountB, 0, 0);
        address pair = ZzmLibrary.pairFor(factory, path[0], path[1]);
        TransferHelper.safeTransferFrom(path[0], from, pair, amountA);
        TransferHelper.safeTransferFrom(path[1], from, pair, amountB);
        liquidity = IZzmPair(pair).mint(from);
    }

    // **** ADD LIQUIDITY ****
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) internal virtual returns (uint amountA, uint amountB) {
        // create the pair if it doesn't exist yet
        if (IZzmFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            IZzmFactory(factory).createPair(tokenA, tokenB);
        }
        (uint reserveA, uint reserveB) = ZzmLibrary.getReserves(factory, tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint amountBOptimal = ZzmLibrary.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, 'ZzmRouter: INSUFFICIENT_B_AMOUNT');
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint amountAOptimal = ZzmLibrary.quote(amountBDesired, reserveB, reserveA);
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, 'ZzmRouter: INSUFFICIENT_A_AMOUNT');
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = ZzmLibrary.pairFor(factory, tokenA, tokenB);
        TransferHelper.safeTransferFrom(tokenA, msg.sender, pair, amountA);
        TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IZzmPair(pair).mint(to);
    }
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external virtual override payable ensure(deadline) returns (uint amountToken, uint amountETH, uint liquidity) {
        (amountToken, amountETH) = _addLiquidity(
            token,
            WETH,
            amountTokenDesired,
            msg.value,
            amountTokenMin,
            amountETHMin
        );
        address pair = ZzmLibrary.pairFor(factory, token, WETH);
        TransferHelper.safeTransferFrom(token, msg.sender, pair, amountToken);
        IWETH(WETH).deposit{value: amountETH}();
        assert(IWETH(WETH).transfer(pair, amountETH));
        liquidity = IZzmPair(pair).mint(to);
        // refund dust eth, if any
        if (msg.value > amountETH) TransferHelper.safeTransferETH(msg.sender, msg.value - amountETH);
    }

    // **** REMOVE LIQUIDITY ****
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountA, uint amountB) {
        address pair = ZzmLibrary.pairFor(factory, tokenA, tokenB);
        console.log("SENDER: ", msg.sender);
        IZzmPair(pair).transferFrom(msg.sender, pair, liquidity); // send liquidity to pair
        //IERC20(pair).transferFrom(msg.sender, pair, liquidity); // send liquidity to pair
        (uint amount0, uint amount1) = IZzmPair(pair).burn(to);
        (address token0,) = ZzmLibrary.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin, 'ZzmRouter: INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'ZzmRouter: INSUFFICIENT_B_AMOUNT');
    }
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountToken, uint amountETH) {
        (amountToken, amountETH) = removeLiquidity(
            token,
            WETH,
            liquidity,
            amountTokenMin,
            amountETHMin,
            address(this),
            deadline
        );
        TransferHelper.safeTransfer(token, to, amountToken);
        IWETH(WETH).withdraw(amountETH);
        TransferHelper.safeTransferETH(to, amountETH);
    }
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external virtual override returns (uint amountA, uint amountB) {
        address pair = ZzmLibrary.pairFor(factory, tokenA, tokenB);
        uint value = approveMax ? uint(-1) : liquidity;
        IZzmPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        (amountA, amountB) = removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline);
    }
    function removeLiquidityETHWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external virtual override returns (uint amountToken, uint amountETH) {
        address pair = ZzmLibrary.pairFor(factory, token, WETH);
        uint value = approveMax ? uint(-1) : liquidity;
        IZzmPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        (amountToken, amountETH) = removeLiquidityETH(token, liquidity, amountTokenMin, amountETHMin, to, deadline);
    }

    // **** REMOVE LIQUIDITY (supporting fee-on-transfer tokens) ****
    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) public virtual override ensure(deadline) returns (uint amountETH) {
        (, amountETH) = removeLiquidity(
            token,
            WETH,
            liquidity,
            amountTokenMin,
            amountETHMin,
            address(this),
            deadline
        );
        TransferHelper.safeTransfer(token, to, IERC20(token).balanceOf(address(this)));
        IWETH(WETH).withdraw(amountETH);
        TransferHelper.safeTransferETH(to, amountETH);
    }
    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external virtual override returns (uint amountETH) {
        address pair = ZzmLibrary.pairFor(factory, token, WETH);
        uint value = approveMax ? uint(-1) : liquidity;
        IZzmPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        amountETH = removeLiquidityETHSupportingFeeOnTransferTokens(
            token, liquidity, amountTokenMin, amountETHMin, to, deadline
        );
    }

    // **** SWAP ****
    // requires the initial amount to have already been sent to the first pair
    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = ZzmLibrary.sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? ZzmLibrary.pairFor(factory, output, path[i + 2]) : _to;
            IZzmPair(ZzmLibrary.pairFor(factory, input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        amounts = ZzmLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'ZzmRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, ZzmLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) returns (uint[] memory amounts) {
        amounts = ZzmLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, 'ZzmRouter: EXCESSIVE_INPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, ZzmLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        payable
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[0] == WETH, 'ZzmRouter: INVALID_PATH');
        amounts = ZzmLibrary.getAmountsOut(factory, msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'ZzmRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(ZzmLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
    }
    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[path.length - 1] == WETH, 'ZzmRouter: INVALID_PATH');
        amounts = ZzmLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, 'ZzmRouter: EXCESSIVE_INPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, ZzmLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferETH(to, amounts[amounts.length - 1]);
    }
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[path.length - 1] == WETH, 'ZzmRouter: INVALID_PATH');
        amounts = ZzmLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, 'ZzmRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, ZzmLibrary.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        TransferHelper.safeTransferETH(to, amounts[amounts.length - 1]);
    }
    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        virtual
        override
        payable
        ensure(deadline)
        returns (uint[] memory amounts)
    {
        require(path[0] == WETH, 'ZzmRouter: INVALID_PATH');
        amounts = ZzmLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= msg.value, 'ZzmRouter: EXCESSIVE_INPUT_AMOUNT');
        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(ZzmLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
        // refund dust eth, if any
        if (msg.value > amounts[0]) TransferHelper.safeTransferETH(msg.sender, msg.value - amounts[0]);
    }

    // **** SWAP (supporting fee-on-transfer tokens) ****
    // requires the initial amount to have already been sent to the first pair
    function _swapSupportingFeeOnTransferTokens(address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = ZzmLibrary.sortTokens(input, output);
            IZzmPair pair = IZzmPair(ZzmLibrary.pairFor(factory, input, output));
            uint amountInput;
            uint amountOutput;
            { // scope to avoid stack too deep errors
            (uint reserve0, uint reserve1,) = pair.getReserves();
            (uint reserveInput, uint reserveOutput) = input == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
            amountInput = IERC20(input).balanceOf(address(pair)).sub(reserveInput);
            amountOutput = ZzmLibrary.getAmountOut(amountInput, reserveInput, reserveOutput);
            }
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOutput) : (amountOutput, uint(0));
            address to = i < path.length - 2 ? ZzmLibrary.pairFor(factory, output, path[i + 2]) : _to;
            pair.swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual override ensure(deadline) {
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, ZzmLibrary.pairFor(factory, path[0], path[1]), amountIn
        );
        uint balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
        _swapSupportingFeeOnTransferTokens(path, to);
        require(
            IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,
            'ZzmRouter: INSUFFICIENT_OUTPUT_AMOUNT'
        );
    }
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    )
        external
        virtual
        override
        payable
        ensure(deadline)
    {
        require(path[0] == WETH, 'ZzmRouter: INVALID_PATH');
        uint amountIn = msg.value;
        IWETH(WETH).deposit{value: amountIn}();
        assert(IWETH(WETH).transfer(ZzmLibrary.pairFor(factory, path[0], path[1]), amountIn));
        uint balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
        _swapSupportingFeeOnTransferTokens(path, to);
        require(
            IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,
            'ZzmRouter: INSUFFICIENT_OUTPUT_AMOUNT'
        );
    }
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    )
        external
        virtual
        override
        ensure(deadline)
    {
        require(path[path.length - 1] == WETH, 'ZzmRouter: INVALID_PATH');
        TransferHelper.safeTransferFrom(
            path[0], msg.sender, ZzmLibrary.pairFor(factory, path[0], path[1]), amountIn
        );
        _swapSupportingFeeOnTransferTokens(path, address(this));
        uint amountOut = IERC20(WETH).balanceOf(address(this));
        require(amountOut >= amountOutMin, 'ZzmRouter: INSUFFICIENT_OUTPUT_AMOUNT');
        IWETH(WETH).withdraw(amountOut);
        TransferHelper.safeTransferETH(to, amountOut);
    }

    // **** LIBRARY FUNCTIONS ****
    function quote(uint amountA, uint reserveA, uint reserveB) public pure virtual override returns (uint amountB) {
        return ZzmLibrary.quote(amountA, reserveA, reserveB);
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut)
        public
        pure
        virtual
        override
        returns (uint amountOut)
    {
        return ZzmLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut)
        public
        pure
        virtual
        override
        returns (uint amountIn)
    {
        return ZzmLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(uint amountIn, address[] memory path)
        public
        view
        virtual
        override
        returns (uint[] memory amounts)
    {
        return ZzmLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(uint amountOut, address[] memory path)
        public
        view
        virtual
        override
        returns (uint[] memory amounts)
    {
        return ZzmLibrary.getAmountsIn(factory, amountOut, path);
    }
}
