//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.0;

import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "@openzeppelin/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/crowdsale/price/IncreasingPriceCrowdsale.sol";

contract OprionTokenCrowdsale is
    Crowdsale,
    MintedCrowdsale,
    CappedCrowdsale,
    TimedCrowdsale,
    WhitelistCrowdsale,
    RefundableCrowdsale,
    Ownable,
    IncreasingPriceCrowdsale
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

    constructor(
        uint256 _rate,
        address payable _wallet,
        ERC20 _token,
        uint256 _cap,
        uint256 _openingTime,
        uint256 _closingTime,
        uint256 _goal
    )
        public
        //uint256 _goal
        Crowdsale(_rate, _wallet, _token)
        CappedCrowdsale(_cap)
        TimedCrowdsale(_openingTime, _closingTime)
        RefundableCrowdsale(_goal)
    {
        require(_goal >= _cap);
        _changeableRate = _rate;
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
}
