var Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider || 'ws://some.local-or-remote.node:8546');

export default async function latestTime() {
    const latestBlock = await web3.eth.getBlock("latest");
    return latestBlock.timestamp;
}