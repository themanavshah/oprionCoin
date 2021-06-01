import Web3 from "web3";

export default function ether(n) {
    const towei = Web3.utils.toWei(n.toString(), 'ether')
    //console.log(typeof towei)
    return new Web3.utils.toBN(towei);
}