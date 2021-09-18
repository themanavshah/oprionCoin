import { assert, expect } from 'chai';
import ether from './helpers/ether';
import EVMRevert from './helpers/EVMRevert';
import time, { duration, increaseTo } from '@openzeppelin/test-helpers/src/time.js'
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
const TokenTimelock = artifacts.require('TokenTimelock');
//const RefundVault = artifacts.require('./RefundVault');


contract('OprionTokenCrowdsale', function ([_, wallet, investor1, investor2, foundersFund, foundationFund, partnersFund]) {

    // beforeEach(async function () {
    //     await web3.eth.sendTransaction({ from: _, to: investor1, value: ether(10) })
    // })

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

        this.foundersFund = foundersFund;
        this.foundationFund = foundationFund;
        this.partnersFund = partnersFund;

        this.investorMinCap = ether(0.002);
        this.investorHardCap = ether(50);

        this.latestTime = await latestTime();

        //ICO Stages
        this.preICOStage = 0;
        this.ICOStage = 1;

        //ICO rates
        this.preICOrate = 500;
        this.ICORate = 250;

        this.tokenSalesPercentage = 70;
        this.foundersPercentage = 10;
        this.foundationPercentage = 10;
        this.partnersPercentage = 10;
        this.totalPercentage = 100;


        console.log('latesttime: ', this.latestTime)
        this.openingTime = parseInt(this.latestTime) + parseInt(time.duration.weeks(1));
        this.closingTime = parseInt(this.openingTime) + parseInt(time.duration.weeks(1));

        console.log('openingtime: ', this.openingTime);
        this.releaseTime = parseInt(this.closingTime) + parseInt(duration.years(1));
        console.log("releasetime: ", this.releaseTime);

        this.crowdsale = await OprionTokenCrowdsale.new(
            this.preICOrate,
            this.wallet,
            this.token.address,
            this.cap,
            this.openingTime,
            this.closingTime,
            this.goal,
            this.foundersFund,
            this.foundationFund,
            this.partnersFund,
            this.releaseTime
        );

        await this.token.pause();
        //console.log(this.crowdsale);
        await this.token.addMinter(this.crowdsale.address);
        await this.token.addPauser(this.crowdsale.address);
        const previousOwner = await this.token.owner();
        console.log("previous owner: ", previousOwner);
        await this.token.transferOwnership(this.crowdsale.address);


        await this.crowdsale.addWhitelisted(investor1);
        await this.crowdsale.addWhitelisted(investor2);

        await time.increaseTo(this.openingTime + 1);

    });


    describe('crowdsale', function () {

        it('trcaks the rate', async function () {
            console.log("_: ", _)
            console.log("wallet: ", wallet)
            console.log("investor1: ", investor1)
            console.log("investor2: ", investor2)
            console.log("crowdsale address: ", this.crowdsale.address);
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
        beforeEach(async function () {

            const dfdfe = await this.token.owner();
            console.log("ownership point1: ", dfdfe);

        });
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
            console.log("PreICOrate :", rate.words[0]);
            console.log("PreICOrate2 :", this.preICOrate);
            assert(rate.words[0], this.preICOrate);
            //rate.words[0].should.be.bignumber.equal(this.preICOrate);
        });

        it('has a set amount of rate in ICOStae', async function () {
            await this.crowdsale.setCrowdsaleStage(this.ICOStage, { from: _ });
            const rate = await this.crowdsale.rate();
            console.log("ICOrate :", rate.words[0]);
            console.log("ICOrate2 :", this.ICORate);
            assert(rate.words[0], this.ICORate);
            //rate.words[0].should.be.bignumber.equal(this.ICOrate);
        });
    });

    describe('when crowdsale in preICO', function () {

        beforeEach(async function () {
            await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
        })
        it('forwards funds to the wallet', async function () {
            const escrowAddress = await this.crowdsale.viewEscrowFunds();
            const balance = await web3.eth.getBalance(escrowAddress);
            // const viewEscrow = await this.crowdsale.getEscrowFunds();
            // console.log(viewEscrow);
            console.log("balancePreICO: ", balance);
            expect(Number(balance)).to.be.above(ether(100).words[0]);
        });
    });

    // describe('when crowdsale in ICO', function () {
    //     beforeEach(async function () {
    //         await this.crowdsale.setCrowdsaleStage(this.ICOStage, { from: _ });
    //         await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
    //     })
    //     it('forwards funds to the escrow fund', async function () {
    //         const escrowAddress = await this.crowdsale.viewEscrowFunds();
    //         const balance = await web3.eth.getBalance(escrowAddress);
    //         console.log("balanceICO: ", balance);
    //         expect(Number(balance)).to.be.above(ether(0).words[0]);
    //     });
    // });



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

    describe('token transfers', function () {
        it('does not allow investors to transfer tokens during crowdsale', async function () {
            await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
            await this.token.transfer(investor2, 1, { from: investor1 }).should.be.rejectedWith(EVMRevert);
        })
    })

    describe('finalize the crowdsale', function () {
        // describe('when the goal is not reached', function () {
        //     beforeEach(async function () {
        //         await this.crowdsale.buyTokens(investor1, { value: ether(1), from: investor1 });
        //         await time.increaseTo(parseInt(this.closingTime) + 1);
        //         await this.crowdsale.finalize({ from: _ });
        //     });

        //     it('allows investor claim refund', async function () {
        //         await this.crowdsale.claimRefund(investor1).should.be.fulfilled;
        //     })

        // });

        describe('when the goal is reached', function () {
            beforeEach(async function () {

                const dfdfe = await this.token.owner();
                console.log("ownership point1: ", dfdfe);
                this.walletBalance = await web3.eth.getBalance(wallet);
                console.log(this.walletBalance);

                await this.crowdsale.buyTokens(investor1, { value: ether(26), from: investor1 });
                const capRaised = await this.crowdsale.cap();
                console.log(capRaised.toString());
                const weirasied = await this.crowdsale.weiRaised();
                console.log(weirasied.toString())
                await this.crowdsale.buyTokens(investor2, { value: ether(26), from: investor2 });

                await time.increaseTo(parseInt(this.closingTime) + 1);
                await this.crowdsale.finalize({ from: _ });
                // //const eventListen = await this.crowdsale.events;
                // const eventsX = await web3.eth.subscribe('logs');
                // console.log("Events: ", eventsX);

                // const erer = await this.token.owner();
                // console.log("ownership point2: ", erer);

            });

            it('handels goal reached', async function () {
                //Token goal reached
                const goalreached = await this.crowdsale.goalReached();
                console.log(goalreached)
                goalreached.should.be.true;

                //Finshes miniting token 
                const mintingfinshed = await this.token.showMintingFinished();
                console.log(mintingfinshed);
                mintingfinshed.should.be.true;

                await this.token.pause();
                const unpause = await this.token.unpause();
                console.log(unpause);
                // const tokenX = this.token;
                // console.log(tokenX);
                const paused = await this.token.paused();
                paused.should.be.false;

                await this.token.transfer(investor2, 1, { from: investor2 }).should.be.fulfilled;

                let totalSupply = await this.token.totalSupply();
                totalSupply = totalSupply.toString();

                //Founders
                const foundersTimelockAddress = await this.crowdsale.foundersTimelock();
                let foundersTimelockBalance = await this.token.balanceOf(foundersTimelockAddress);
                foundersTimelockBalance = foundersTimelockBalance.toString();
                foundersTimelockBalance = foundersTimelockBalance / (10 ** this.decimals);

                let foundersAmount = totalSupply / this.foundersPercentage;
                foundersAmount = foundersAmount.toString();
                foundersAmount = foundersAmount / (10 ** this.decimals);

                assert.equal(foundersTimelockBalance.toString(), foundersAmount.toString());

                //Partners
                const partnersTimelockAddress = await this.crowdsale.partnersTimelock();
                let partnersTimelockBalance = await this.token.balanceOf(partnersTimelockAddress);
                partnersTimelockBalance = partnersTimelockBalance.toString();
                partnersTimelockBalance = partnersTimelockBalance / (10 ** this.decimals);

                let partnersAmount = totalSupply / this.partnersPercentage;
                partnersAmount = partnersAmount.toString();
                partnersAmount = partnersAmount / (10 ** this.decimals);

                assert.equal(partnersTimelockBalance.toString(), partnersAmount.toString());

                //Foundation
                const foundationTimelockAddress = await this.crowdsale.foundationTimelock();
                let foundationTimelockBalance = await this.token.balanceOf(foundationTimelockAddress);
                foundationTimelockBalance = foundationTimelockBalance.toString();
                foundationTimelockBalance = foundationTimelockBalance / (10 ** this.decimals);

                let foundationAmount = totalSupply / this.foundationPercentage;
                foundationAmount = foundationAmount.toString();
                foundationAmount = foundationAmount / (10 ** this.decimals);

                assert.equal(foundationTimelockBalance.toString(), foundationAmount.toString());

                //can't withdraw from Timelocks
                const foundersTimelock = await TokenTimelock.at(foundersTimelockAddress);
                await foundersTimelock.release().should.be.rejectedWith(EVMRevert);

                const foundationTimelock = await TokenTimelock.at(foundationTimelockAddress);
                await foundationTimelock.release().should.be.rejectedWith(EVMRevert);

                const partnersTimelock = await TokenTimelock.at(partnersTimelockAddress);
                await partnersTimelock.release().should.be.rejectedWith(EVMRevert);

                //allow them to wirhdraw after release time
                await time.increaseTo(parseInt(this.releaseTime) + 1);

                await foundersTimelock.release().should.be.fulfilled;
                await foundationTimelock.release().should.be.fulfilled;
                await partnersTimelock.release().should.be.fulfilled;

                //Funds now have balances

                //Founders
                let foundersBalance = await this.token.balanceOf(this.foundersFund);
                foundersBalance = foundersBalance.toString();
                foundersBalance = foundersBalance / (10 ** this.decimals);

                //Foundation
                let foundationBalance = await this.token.balanceOf(this.foundationFund);
                foundationBalance = foundationBalance.toString();
                foundationBalance = foundationBalance / (10 ** this.decimals);

                //partners
                let partnersBalance = await this.token.balanceOf(this.partnersFund);
                partnersBalance = partnersBalance.toString();
                partnersBalance = partnersBalance / (10 ** this.decimals);

                assert.equal(foundersBalance.toString(), foundersAmount.toString());
                assert.equal(foundationBalance.toString(), foundationAmount.toString());
                assert.equal(partnersBalance.toString(), partnersAmount.toString());

                // const owx = await this.crowdsale.address;
                // console.log(owx)
                await this.token.transferOwnership(this.wallet);
                const ownerX = await this.token.owner();
                //console.log(ownerX);
                ownerX.should.be.equal(this.wallet);

                //prevent investor from claiming refund
                await this.crowdsale.claimRefund(investor1).should.be.rejectedWith(EVMRevert);
            })

        });

        describe('token distribution', function () {
            it('has 70% in tokenSale percentage', async function () {
                const tokenSaleper = await this.crowdsale.tokenSalesPercentage();
                console.log(tokenSaleper);
                tokenSaleper.toString().should.be.bignumber.equal(this.tokenSalesPercentage);
            });

            it('has 10% in founders percentage', async function () {
                const founderPer = await this.crowdsale.foundersPercentage();
                founderPer.toString().should.be.bignumber.equal(this.foundersPercentage);
            });

            it('has 10% in foundation percentage', async function () {
                const foundationPer = await this.crowdsale.foundationPercentage();
                foundationPer.toString().should.be.bignumber.equal(this.foundationPercentage);
            });

            it('has 10% in partners percentage', async function () {
                const partnerPer = await this.crowdsale.partnersPercentage();
                partnerPer.toString().should.be.bignumber.equal(this.partnersPercentage);
            });

            it('is valid percentage number', async function () {
                const tokenSaleper = await this.crowdsale.tokenSalesPercentage();
                const founderPer = await this.crowdsale.foundersPercentage();
                const foundationPer = await this.crowdsale.foundationPercentage();
                const partnerPer = await this.crowdsale.partnersPercentage();
                const totalPercentage = parseInt(tokenSaleper.toString()) + parseInt(founderPer.toString()) + parseInt(foundationPer.toString()) + parseInt(partnerPer.toString())
                totalPercentage.toString().should.be.bignumber.equal(this.totalPercentage);

            });
        })
    });



});