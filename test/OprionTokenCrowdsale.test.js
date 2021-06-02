import { assert } from 'chai';
import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import time from '@openzeppelin/test-helpers/src/time.js'
import latestTime from './helpers/latestTime';

var Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider || 'ws://some.local-or-remote.node:8546');
const BigNumber = web3.bignumber;

require("chai")
    .use(require('chai-bignumber')(BigNumber))
    .use(require('chai-as-promised'))
    .should();

const OprionToken = artifacts.require('OprionToken');
const OprionTokenCrowdsale = artifacts.require('OprionTokenCrowdsale');
//const RefundVault = artifacts.require('./RefundVault');


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

        //this.rate = 500;
        this.wallet = wallet;
        this.cap = ether(100);
        this.goal = ether(50);

        this.investorMinCap = ether(0.002);
        this.investorHardCap = ether(50);

        this.latestTime = await latestTime();

        //ICO Stages
        this.preICOStage = 0;
        this.ICOStage = 1;

        //ICO rates
        this.preICOrate = 500;
        this.ICORate = 250;


        console.log('latesttime: ', this.latestTime)
        this.openingTime = parseInt(this.latestTime) + parseInt(time.duration.weeks(1));
        this.closingTime = this.openingTime + time.duration.weeks(1);

        console.log('openingtime: ', this.openingTime);

        this.crowdsale = await OprionTokenCrowdsale.new(
            this.preICOrate,
            this.wallet,
            this.token.address,
            this.cap,
            this.openingTime,
            this.closingTime,
            this.cap
        );
        await this.token.addMinter(this.crowdsale.address);
        await this.token.transferOwnership(this.crowdsale.address);

        // this.vaultAddress = await this.crowdsale.valut();
        // this.vault = RefundVault.at(this.vaultAddress);

        await this.crowdsale.addWhitelisted(investor1);
        await this.crowdsale.addWhitelisted(investor2);

        await time.increaseTo(this.openingTime + 1);
    });


    describe('crowdsale', function () {

        it('trcaks the rate', async function () {
            const rateinit = await this.crowdsale.rate();
            const rate = rateinit.words[0];
            rate.should.be.bignumber.equal(this.preICOrate);
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

    describe('capped crowdsale', function () {
        it('has the correct hard cap', async function () {
            const cap = await this.crowdsale.cap();
            // console.log(cap);
            // console.log(this.cap);
            cap.words[0].should.be.bignumber.equal(this.cap.words[0]);
        })
    });

    describe('timed crowdsale', function () {
        it('is open', async function () {
            const isClosed = await this.crowdsale.hasClosed();
            isClosed.should.be.false;
        })
    });

    describe('whitelisted crowdsale', function () {
        it('rejects contribution from non-whitelisted investors', async function () {
            const notWhiteListed = _;
            await this.crowdsale.buyTokens(notWhiteListed, { value: ether(1), from: notWhiteListed }).should.be.rejectedWith(EVMRevert);
        })
    });

    describe('refundable crowdsale', function () {
        beforeEach(async function () {
            await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
        })

        describe('during crowdsale', function () {
            it('prevents the investor from claiming refund', async function () {
                await this.crowdsale.claimRefund(investor1).should.be.rejectedWith(EVMRevert);
            })
        })
    });


    describe('crowdsale stages', function () {
        it('satrts in preICO ', async function () {
            const stage = await this.crowdsale.stage();
            console.log(this.preICOStage);
            console.log(stage);
            stage.words[0].should.be.bignumber.equal(this.preICOStage);
        });

        it('allows admin to update the stage', async function () {
            await this.crowdsale.setCrowdsaleStage(this.ICOStage, { from: _ });
            const stage = await this.crowdsale.stage();
            stage.words[0].should.be.bignumber.equal(this.ICOStage);
        })

        it('prevents non-admin to update the stage', async function () {
            await this.crowdsale.setCrowdsaleStage(this.ICOStage, { from: investor1 }).should.be.rejectedWith(EVMRevert);
        })

        it('has a set amount of rate in preICOStae', async function () {
            await this.crowdsale.setCrowdsaleStage(this.preICOStage, { from: _ });
            const rate = await this.crowdsale.rate();
            console.log("PreICOrate :", rate);
            rate.words[0].should.be.bignumber.equal(this.preICOrate);
        });

        it('has a set amount of rate in ICOStae', async function () {
            await this.crowdsale.setCrowdsaleStage(this.ICOStage, { from: _ });
            const rate = await this.crowdsale.rate();
            console.log("ICOrate :", rate);
            rate.words[0].should.be.bignumber.equal(this.ICOrate);
        });
    });

    // describe('preICO stages', function () {
    //     it('has a rate in rang of PreICO & ICO', async function () {
    //         await this.crowdsale.setCrowdsaleStage(this.PreICOStage, { from: _ });
    //         const rate = await this.crowdsale.rate();
    //         console.log("PreICOrate :", rate);
    //     });
    // })



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
            await this.crowdsale.buyTokens(investor1, { value: value }).should.be.fulfilled;
            await this.crowdsale.buyTokens(investor1, { value: value, from: purchaser }).should.be.fulfilled;
            // await web3.eth.sendTransaction({
            //     from: investor1,
            //     to: this.crowdsale.address,
            //     value: value
            // })
            //await this.crowdsale.buyTokens(investor1)
        })
    });

    describe('buyTokens()', function () {
        describe('when the contribution s less than min cap', function () {
            it('rejects the transaction', async function () {
                const value = this.investorMinCap - 1;
                //console.log(value);
                await this.crowdsale.buyTokens(investor1, { value: value }).should.be.rejectedWith(EVMRevert);
            })
        })
    });

    describe('when the investor has minimum cap', function () {
        it('allows investor to contribute below max cap.', async function () {
            //first contribution valid
            const value1 = ether(1);
            await this.crowdsale.buyTokens(investor1, { value: value1, from: investor1 });
            //second contribution in range valid
            const value2 = 1;
            await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.fulfilled;
        })
    });

    describe('when the investor is excedding total contribution', function () {
        it('rejects the transaction', async function () {
            //first contribution valid
            const value1 = ether(2);
            await this.crowdsale.buyTokens(investor1, { value: value1, from: investor1 });
            //second contribution out of range
            const value2 = ether(49);
            await this.crowdsale.buyTokens(investor1, { value: value2, from: investor1 }).should.be.rejectedWith(EVMRevert);
        })
    });

    describe('when contribution is in valid range', function () {
        it('succeeds and accept the payment ', async function () {

            const value = ether(2);
            await this.crowdsale.buyTokens(investor2, { value: value, from: investor2 }).should.be.fulfilled;
            const contribution = await this.crowdsale.getUserContribution(investor2);
            //console.log("contributions: ", contribution.words[0], value);
            contribution.words[0].should.be.bignumber.equal(value.words[0])
        })
    });



});