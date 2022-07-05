// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TestToken is ERC721, Ownable {
	using Counters for Counters.Counter;

	Counters.Counter private _tokenIdCounter;
	
	enum status {Personal, Sale, WideSale}

	mapping(uint256 => address) private whoCanBuy;
	mapping(uint256 => uint256) private costs;
	mapping(uint256 => status) private statuses;
	mapping (address => uint256) private goods;

	uint256 royalty = 1;

	constructor() ERC721("TestToken", "TT") {}

	function _baseURI() internal pure override returns (string memory) {
		return "TestURI://";
	}

	function safeMint(address to) external onlyOwner {
		uint256 tokenId = _tokenIdCounter.current();
		_tokenIdCounter.increment();
		_safeMint(to, tokenId);
		statuses[tokenId] = status.Personal;
	}

	function canBuy(address who, uint256 tokenId) view public
	returns (bool)
	{
		if (statusOf(tokenId) == status.WideSale)
		{
			return true;
		}
		else if (statusOf(tokenId) == status.Sale && whoCanBuy[tokenId] == who)
		{
			return true;
		}
		return false;
	}

	function goodsOf(address who) external view
	returns (uint256)
	{
		return goods[who];
	}

	function costOf(uint256 tokenId) view external
	returns (uint256)
	{
		_requireMinted(tokenId);
		require(statuses[tokenId] != status.Personal, "Token is not on sale");

		return costs[tokenId];
	}

	function statusOf(uint256 tokenId) view public
	returns (status)
	{
		_requireMinted(tokenId);
		return statuses[tokenId];
	}

	function saleFor(address buyer, uint256 cost, uint256 tokenId) external
	{
		_requireMinted(tokenId);
		require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner nor approved");

		whoCanBuy[tokenId] = buyer;
		costs[tokenId] = cost;
		statuses[tokenId] = status.Sale;
	}

	function saleForAll(uint256 cost, uint256 tokenId) external
	{
		_requireMinted(tokenId);
		require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner nor approved");

		statuses[tokenId] = status.WideSale;
		costs[tokenId] = cost;
	}

	function buy(uint256 tokenId) external payable
	{
		_requireMinted(tokenId);
		require(canBuy(_msgSender(), tokenId), "Caller can't buy this token");
		require(_msgValue() >= costs[tokenId], "Message value are too low");

		statuses[tokenId] = status.Personal;

		address prevOwner = ownerOf(tokenId);
		_safeTransfer(ownerOf(tokenId), _msgSender(), tokenId, "");
		
		addGoods(prevOwner, costs[tokenId]);
		goods[_msgSender()] += _msgValue() - costs[tokenId];
	}

	function addGoods(address getter, uint256 amount) private
	{
		uint256 ownerAmount = amount * royalty / 100;
		goods[owner()] += ownerAmount;
		goods[getter] += amount - ownerAmount;
	}

	function withdraw() external
	{
		require(goods[_msgSender()] > 0, "Nothing to withdraw");

		uint256 amount = goods[_msgSender()];
		goods[_msgSender()] = 0;

		payable(_msgSender()).transfer(amount);
	}

	function _msgValue() internal
	returns (uint256)
	{
		return msg.value;
	}

}
