require("chai")
    .should();

const OprionToken = artifacts.require('OprionToken');

contract('OprionToken', accounts => {

    const _name = "Oprion";
    const _symbol = 'ORC';

    beforeEach(async function () {
        this.token = await OprionToken.new(_name, _symbol);
        //console.log(this.token.name());
    });

    describe('token attributes', function () {
        it('has the correct name', async function () {
            const name = await this.token.name();
            name.should.equal(_name);
            //assert.equal(name, 'Oprion')
            // OprionToken.deployed().then((instance) => {
            //     deployedToken = instance;
            //     instance.name().then(function (n) {
            //         //console.log(n)
            //         assert.equal(n, 'Oprion')
            //     })
            // })
        });

        it('has the correct symbol', async function () {
            const symbol = await this.token.symbol();
            symbol.should.equal(_symbol);
        });
    });
});