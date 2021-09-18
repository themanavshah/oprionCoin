const { duration } = require("@openzeppelin/test-helpers/src/time");
const { default: latestTime } = require("../test/helpers/latestTime");

const OprionToken = artifacts.require("./OprionToken.sol");
const OprionTokenCrowdsale = artifacts.require("./OprionTokenCrowdsale.sol");

const Web3 = require('web3');

function ether(n) {
    const towei = Web3.utils.toWei(n.toString(), 'ether')
    //console.log(typeof towei)
    return new Web3.utils.toBN(towei);
}

module.exports = async function (deployer, network, accounts) {
    const _name = "Oprion"
    const _symbol = "ORC"
    const _decimals = 18

    await deployer.deploy(OprionToken, _name, _symbol, _decimals);
    const deployedToken = await OprionToken.deployed();

    const latestTime = (new Date).getTime();

    const _preICOrate = 500;
    const _wallet = accounts[0];
    const _token = deployedToken.address;
    const _cap = ether(100);
    const _openingTime = parseInt(latestTime) + parseInt(duration.minutes(1));
    const _closingTime = parseInt(_openingTime) + parseInt(duration.weeks(1));
    const _goal = ether(50);
    const _foundersFund = accounts[0];
    const _foundationFund = accounts[0];
    const _partnersFund = accounts[0];
    const _releaseTime = parseInt(_closingTime) + parseInt(duration.days(1));


    await deployer.deploy(
        OprionTokenCrowdsale,
        _preICOrate,
        _wallet,
        _token,
        _cap,
        _openingTime,
        _closingTime,
        _goal,
        _foundersFund,
        _foundationFund,
        _partnersFund,
        _releaseTime
    );

    return true;
};
