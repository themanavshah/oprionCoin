//SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract OprionToken is ERC721 {
    constructor(string memory _name, string memory _symbol)
        public
        ERC721(_name, _symbol)
    {}
}
