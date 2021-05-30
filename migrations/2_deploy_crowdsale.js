const OprionToken = artifacts.require("./OprionToken.sol");

module.exports = function (deployer) {
    const _name = "Opriontoken"
    const _symbol = "ORC"

    deployer.deploy(OprionToken, _name, _symbol);
};
