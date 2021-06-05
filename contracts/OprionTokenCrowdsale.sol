//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.0;

import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/payment/escrow/RefundEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/TokenTimelock.sol";

// import "@openzeppelin/contracts/crowdsale/price/IncreasingPriceCrowdsale.sol";

contract OprionTokenCrowdsale is
    Crowdsale,
    MintedCrowdsale,
    CappedCrowdsale,
    TimedCrowdsale,
    WhitelistCrowdsale,
    RefundableCrowdsale,
    Ownable
{
    uint256 public investorMinCap = 2000000000000000;
    uint256 public investorHardCap = 50000000000000000000;
    mapping(address => uint256) public contributions;

    enum CrowdsaleStage {PreICO, ICO}

    CrowdsaleStage public stage = CrowdsaleStage.PreICO;

    // uint256 initaltokenRate = 0;
    uint256 preICOtokenRate = 500;
    uint256 ICOtokenRate = 250;

    uint256 _changeableRate;

    // event DeployerIdentity(address _userAddress);

    uint256 public tokenSalesPercentage = 70;
    uint256 public foundersPercentage = 10;
    uint256 public foundationPercentage = 10;
    uint256 public partnersPercentage = 10;

    address public foundersFund;
    address public foundationFund;
    address public partnersFund;

    TokenTimelock public foundersTimelock;
    TokenTimelock public foundationTimelock;
    TokenTimelock public partnersTimelock;

    uint256 public releaseTime;

    constructor(
        uint256 _rate,
        address payable _wallet,
        ERC20 _token,
        uint256 _cap,
        uint256 _openingTime,
        uint256 _closingTime,
        uint256 _goal,
        address _foundersFund,
        address _foundationFund,
        address _partnersFund,
        uint256 _releaseTime
    )
        public
        //uint256 _goal
        Crowdsale(_rate, _wallet, _token)
        CappedCrowdsale(_cap)
        TimedCrowdsale(_openingTime, _closingTime)
        RefundableCrowdsale(_goal)
    {
        require(_goal <= _cap);
        _changeableRate = _rate;
        foundersFund = _foundersFund;
        foundationFund = _foundationFund;
        partnersFund = _partnersFund;
        releaseTime = _releaseTime;
    }

    /**
     * @dev returns the amount contributed by a specific user
     * @param beneficiary Address of the contributor
     */
    function getUserContribution(address beneficiary)
        public
        view
        returns (uint256)
    {
        return contributions[beneficiary];
    }

    function viewEscrowFunds() public view returns (RefundEscrow) {
        return RefundEscrow(wallet());
    }

    function weiRaisedX() public view returns (uint256) {
        return weiRaised();
    }

    /**
     * @dev Overrides parent method taking into account variable rate.
     * @param weiAmount The value in wei to be converted into tokens
     * @return The number of tokens _weiAmount wei will buy at present time
     */
    function _getTokenAmount(uint256 weiAmount)
        internal
        view
        returns (uint256)
    {
        return weiAmount.mul(_changeableRate);
    }

    /**
     * @return the number of token units a buyer gets per wei.
     */
    function rate() public view returns (uint256) {
        return _changeableRate;
    }

    /**
     * @dev Allows admin to update crowdsale stages.
     * @param _stage Address of purchaser.
     */
    function setCrowdsaleStage(uint256 _stage) public onlyOwner {
        if (uint256(CrowdsaleStage.PreICO) == _stage) {
            stage = CrowdsaleStage.PreICO;
        } else if (uint256(CrowdsaleStage.ICO) == _stage) {
            stage = CrowdsaleStage.ICO;
        }

        if (stage == CrowdsaleStage.PreICO) {
            _changeableRate = preICOtokenRate;
        } else if (stage == CrowdsaleStage.ICO) {
            _changeableRate = ICOtokenRate;
        }
    }

    /**
     * @dev forward funds to wallet during preICO and sending funds to escrow during ICO.
     */
    function _forwardFunds() internal {
        if (stage == CrowdsaleStage.PreICO) {
            wallet().transfer(msg.value);
        } else if (stage == CrowdsaleStage.ICO) {
            super._forwardFunds();
        }
    }

    /**
     * @dev Extended behaviour for changing state of _preValidatePurchase and respecting investor's max/min contributions.
     * @param _beneficiary Address of purchaser.
     * @param _weiAmount Amount of wei contributed
     */
    function _updatePurchasingState(address _beneficiary, uint256 _weiAmount)
        internal
    {
        super._preValidatePurchase(_beneficiary, _weiAmount);
        uint256 _existingContribution = contributions[_beneficiary];
        uint256 _newContribution = _existingContribution.add(_weiAmount);
        require(
            _newContribution > investorMinCap &&
                _newContribution <= investorHardCap
        );
        contributions[_beneficiary] = _newContribution;
    }

    /**
     * @dev enables token transfer, called when owner calls finalize();
     */
    function _finalization() internal {
        if (goalReached()) {
            address _tokenAddress = address(token());
            ERC20Mintable _mintableToken = ERC20Mintable(_tokenAddress);
            uint256 _alreadyMinted = _mintableToken.totalSupply();

            IERC20 _tokenTT = token();

            uint256 _finalTotalSupply =
                _alreadyMinted.div(tokenSalesPercentage).mul(100);

            foundersTimelock = new TokenTimelock(
                _tokenTT,
                foundersFund,
                releaseTime
            );
            foundationTimelock = new TokenTimelock(
                _tokenTT,
                foundationFund,
                releaseTime
            );
            partnersTimelock = new TokenTimelock(
                _tokenTT,
                partnersFund,
                releaseTime
            );

            _mintableToken.mint(
                address(foundersTimelock),
                _finalTotalSupply.div(foundersPercentage)
            );

            _mintableToken.mint(
                address(foundationTimelock),
                _finalTotalSupply.div(foundersPercentage)
            );

            _mintableToken.mint(
                address(partnersTimelock),
                _finalTotalSupply.div(foundersPercentage)
            );

            _mintableToken.finishMinting();

            ERC20Pausable _pausableToken = ERC20Pausable(_tokenAddress);
            _pausableToken.unpause();
            this.transferOwnership(wallet());
        }
        super._finalization();
    }
}
