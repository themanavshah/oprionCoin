import { assert } from 'chai';
import ether from './helpers/ether';
var Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider || 'ws://some.local-or-remote.node:8546');
const BigNumber = web3.bignumber;

require("chai")
    .use(require('chai-bignumber')(BigNumber))
    .should();

const OprionToken = artifacts.require('OprionToken');
const OprionTokenCrowdsale = artifacts.require('OprionTokenCrowdsale');


contract('OprionTokenCrowdsale', function ([_, wallet, investor1, investor2]) {

    beforeEach(async function () {
        this.name = "Oprion";
        this.symbol = 'ORC';
        this.decimals = 18;

        this.token = await OprionToken.new(
            this.name,
            this.symbol,
            this.decimals
        );
        //console.log(this.token.name());

        this.rate = 500;
        this.wallet = wallet;

        this.crowdsale = await OprionTokenCrowdsale.new(
            this.rate,
            this.wallet,
            this.token.address
        );
        await this.token.addMinter(this.crowdsale.address);
        await this.token.transferOwnership(this.crowdsale.address);
    });


    describe('crowdsale', function () {

        it('trcaks the rate', async function () {
            const rateinit = await this.crowdsale.rate();
            const rate = rateinit.words[0];
            rate.should.be.bignumber.equal(this.rate);
        });

        it('trcaks the wallet', async function () {
            const wallet = await this.crowdsale.wallet();
            wallet.should.equal(this.wallet);
        });

        it('trcaks the token', async function () {
            const token = await this.crowdsale.token();
            token.should.equal(this.token.address);
        });
    });

    describe('minted tokens', function () {
        it('mints tokens after purchase', async function () {
            const originallyTotalSupply = await this.token.totalSupply();
            await this.crowdsale.buyTokens(investor1, { value: ether(1) });
            const newTotalSupply = await this.token.totalSupply();
            console.log(originallyTotalSupply);
            console.log(newTotalSupply);
            assert.isTrue(newTotalSupply > originallyTotalSupply);
        })
    })

    describe('accepting payments', function () {
        it('should accept payments', async function () {
            const value = ether(1)
            //console.log(value)
            // console.log(web3.eth.sendTransaction({
            //     from: investor1,
            //     to: this.crowdsale.address,
            //     value: value
            // }));
            const purchaser = investor2
            await this.crowdsale.buyTokens(investor1, { value: value });
            await this.crowdsale.buyTokens(investor1, { value: value, from: purchaser });
            // await web3.eth.sendTransaction({
            //     from: investor1,
            //     to: this.crowdsale.address,
            //     value: value
            // })
            //await this.crowdsale.buyTokens(investor1)
        })
    })
});