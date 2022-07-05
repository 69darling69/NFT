const { Provider } = require("@ethersproject/abstract-provider");
const { expect } = require("chai");
const { exec } = require("child_process");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { start } = require("repl");

before(async function () {
	TestToken = await ethers.getContractFactory("TestToken");
	[Admin, Alice, Bob, Eve] = await ethers.getSigners();
	
	TestToken = await TestToken.deploy();
});

describe("TestToken", function() {
	const cost = 1_000_000;
	const royalty = 0.01;

	it("Safe mint as Admin", async function () {
		await expect(
			TestToken.connect(Admin).safeMint(Alice.address)
		).to.be.not.reverted;
	});

	it("Minted Token owner", async function () {
		await expect(
			await TestToken.connect(Eve).ownerOf(0)
		).to.be.equal(Alice.address);
	});

	it("Minted Token URI", async function () {
		await expect(
			await TestToken.connect(Eve).tokenURI(0)
		).to.be.equal("TestURI://" + 0);
	});

	it("Token balance of owner", async function () {
		await expect(
			await TestToken.connect(Eve).balanceOf(Alice.address)
		).to.be.equal(1);
	});

	it("Safe mint as non-Admin must be reverted", async function () {
		await expect(
			TestToken.connect(Eve).safeMint(Alice.address)
		).to.be.reverted;
	});

	it("Eve can't see cost", async function () {
		await expect(
			TestToken.connect(Eve).costOf(0)
		).to.be.reverted;
	});

	it("Sale for Bob from owner of Token", async function () {
		await expect(
			await TestToken.connect(Alice).saleFor(Bob.address, cost, 0)
		).to.be.not.reverted;
	});

	it("Eve can see cost of Token after sale (=cost)", async function () {
		await expect(
			await TestToken.connect(Eve).costOf(0)
		).to.be.equal(cost);
	});

	it("Eve can't buy", async function () {
		await expect(
			await TestToken.connect(Eve).canBuy(Eve.address, 0)
		).to.be.false;

		await expect(
			TestToken.connect(Eve).buy(0, {value: cost})
		).to.be.reverted;
	});

	it("Bob can buy", async function () {
		await expect(
			await TestToken.connect(Eve).canBuy(Bob.address, 0)
		).to.be.true;
	});

	it("Bob buy", async function () {
		await expect(
			TestToken.connect(Bob).buy(0, {value: cost})
		).to.be.not.reverted;
		
		await expect(
			await TestToken.connect(Eve).ownerOf(0)
		).to.be.equal(Bob.address);

		await expect(
			await TestToken.connect(Eve).balanceOf(Bob.address)
		).to.be.equal(1);
	});

	it("New Token owner", async function () {        
		await expect(
			await TestToken.connect(Eve).ownerOf(0)
		).to.be.equal(Bob.address);

		await expect(
			await TestToken.connect(Eve).balanceOf(Bob.address)
		).to.be.equal(1);
	});

	it("Balances of seller and buyer", async function () {
		await expect(
			await TestToken.connect(Eve).balanceOf(Alice.address)
		).to.be.equal(0);

		await expect(
			await TestToken.connect(Eve).balanceOf(Bob.address)
		).to.be.equal(1);
	});

	it("Goods of Alice", async function () {
		await expect(
			await TestToken.connect(Eve).goodsOf(Alice.address)
		).to.be.equal(cost * (1 - royalty));
	});

	it("Goods of Admin", async function () {
		await expect(
			await TestToken.connect(Eve).goodsOf(Admin.address)
		).to.be.equal(cost * royalty);
	});

	it("Alice withdraw", async function () {
		goodsBefore = BigInt(await TestToken.provider.getBalance(Alice.address));

		tx = await TestToken.connect(Alice).withdraw();

		const receipt = await tx.wait();
		const txFee = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.effectiveGasPrice);

		goodsAfter = BigInt(await TestToken.provider.getBalance(Alice.address));

		await expect(goodsAfter - goodsBefore + txFee).to.be.equal(cost * (1 - royalty));
	});

	it("Contract goods after withdraw", async function () {
		await expect(
			await TestToken.provider.getBalance(TestToken.address)
		).to.be.equal(cost * royalty);
	});

	it("Eve withdraw with empty goods", async function () {
		await expect(
			TestToken.connect(Eve).withdraw()
		).to.be.reverted;
	});

	it("Admin withdraw", async function () {
		goodsBefore = BigInt(await TestToken.provider.getBalance(Admin.address));

		tx = await TestToken.connect(Admin).withdraw();

		const receipt = await tx.wait();
		const txFee = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.effectiveGasPrice);

		goodsAfter = BigInt(await TestToken.provider.getBalance(Admin.address));

		await expect(goodsAfter - goodsBefore + txFee).to.be.equal(cost * royalty);
	});

	it("Contract goods after all withdraw are empty", async function () {
		await expect(
			await TestToken.provider.getBalance(TestToken.address)
		).to.be.equal(0);
	});

	it("Safe Mint second token", async function () {
		await expect(
			TestToken.connect(Admin).safeMint(Alice.address)
		).to.be.not.reverted;
	});

	it("Second minted Token owner", async function () {
		await expect(
			await TestToken.connect(Eve).ownerOf(1)
		).to.be.equal(Alice.address);
	});

	it("Second minted Token URI", async function () {
		await expect(
			await TestToken.connect(Eve).tokenURI(1)
		).to.be.equal("TestURI://" + 1);
	});

	it("Sale for all by Eve (error)", async function () {
		await expect(
			TestToken.connect(Eve).saleForAll(cost, 1)
		).to.be.reverted;
	});

	it("Sale for all by Alice", async function () {
		await expect(
			TestToken.connect(Alice).saleForAll(cost, 1)
		).to.be.not.reverted;
	});

	it("Bob and Eve can buy", async function () {
		await expect(
			await TestToken.connect(Bob).canBuy(Bob.address, 1)
		).to.be.true;

		await expect(
			await TestToken.connect(Eve).canBuy(Eve.address, 1)
		).to.be.true;
	});

	it("Eve buys with not enought value", async function () {
		await expect(
			TestToken.connect(Eve).buy(1, {value: cost / 2})
		).to.be.reverted;
	});

	it("Bob buys x2 cost", async function () {
		await expect(
			TestToken.connect(Bob).buy(1, {value: cost * 2})
		).to.be.not.reverted;
	});

	it("Eve buys after Bob", async function () {
		await expect(
			TestToken.connect(Eve).buy(1, {value: cost})
		).to.be.reverted;
	});

	it("New Token owner", async function () {        
		await expect(
			await TestToken.connect(Eve).ownerOf(1)
		).to.be.equal(Bob.address);

		await expect(
			await TestToken.connect(Eve).balanceOf(Bob.address)
		).to.be.equal(2);
	});

	it("Balances of seller and buyer", async function () {
		await expect(
			await TestToken.connect(Eve).balanceOf(Alice.address)
		).to.be.equal(0);

		await expect(
			await TestToken.connect(Eve).balanceOf(Bob.address)
		).to.be.equal(2);
	});

	it("Goods of Alice", async function () {
		await expect(
			await TestToken.connect(Eve).goodsOf(Alice.address)
		).to.be.equal(cost * (1 - royalty));
	});

	it("Goods of Admin", async function () {
		await expect(
			await TestToken.connect(Eve).goodsOf(Admin.address)
		).to.be.equal(cost * royalty);
	});

	it("Alice withdraw", async function () {
		goodsBefore = BigInt(await TestToken.provider.getBalance(Alice.address));

		tx = await TestToken.connect(Alice).withdraw();

		const receipt = await tx.wait();
		const txFee = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.effectiveGasPrice);

		goodsAfter = BigInt(await TestToken.provider.getBalance(Alice.address));

		await expect(goodsAfter - goodsBefore + txFee).to.be.equal(cost * (1 - royalty));
	});

	it("Bob withdraw", async function () {
		goodsBefore = BigInt(await TestToken.provider.getBalance(Bob.address));

		tx = await TestToken.connect(Bob).withdraw();

		const receipt = await tx.wait();
		const txFee = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.effectiveGasPrice);

		goodsAfter = BigInt(await TestToken.provider.getBalance(Bob.address));

		await expect(goodsAfter - goodsBefore + txFee).to.be.equal(cost);
	});

	it("Contract goods after withdraw", async function () {
		await expect(
			await TestToken.provider.getBalance(TestToken.address)
		).to.be.equal(cost * royalty);
	});

	it("Eve withdraw with empty goods", async function () {
		await expect(
			TestToken.connect(Eve).withdraw()
		).to.be.reverted;
	});

	it("Admin withdraw", async function () {
		goodsBefore = BigInt(await TestToken.provider.getBalance(Admin.address));

		tx = await TestToken.connect(Admin).withdraw();

		const receipt = await tx.wait();
		const txFee = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.effectiveGasPrice);

		goodsAfter = BigInt(await TestToken.provider.getBalance(Admin.address));

		await expect(goodsAfter - goodsBefore + txFee).to.be.equal(cost * royalty);
	});

	it("Contract goods after all withdraw are empty", async function () {
		await expect(
			await TestToken.provider.getBalance(TestToken.address)
		).to.be.equal(0);
	});
	
});

	