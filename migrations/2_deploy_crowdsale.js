const OprionToken = artifacts.require("./OprionToken.sol");

module.exports = function (deployer) {
    const _name = "Oprion"
    const _symbol = "ORC"
    const _decimals = 18

    deployer.deploy(OprionToken, _name, _symbol, _decimals);
};
