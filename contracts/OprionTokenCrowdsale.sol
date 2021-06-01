//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.0;

import "@openzeppelin/contracts/crowdsale/Crowdsale.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/crowdsale/emission/MintedCrowdsale.sol";

contract OprionTokenCrowdsale is Crowdsale, MintedCrowdsale {
    constructor(
        uint256 _rate,
        address payable _wallet,
        ERC20 _token
    ) public Crowdsale(_rate, _wallet, _token) {}
}
