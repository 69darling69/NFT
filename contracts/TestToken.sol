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

	uint256 royalty = 1;
	uint256 denominator = 100;

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

	function cancelSale(uint256 tokenId) external
	{
		_requireMinted(tokenId);
		require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not token owner nor approved");

		statuses[tokenId] = status.Personal;
	}

	function buy(uint256 tokenId) external payable
	{
		_requireMinted(tokenId);
		require(canBuy(_msgSender(), tokenId), "Caller can't buy this token");
		require(_msgValue() >= costs[tokenId], "Message value are too low");

		statuses[tokenId] = status.Personal;

		address prevOwner = ownerOf(tokenId);
		_safeTransfer(ownerOf(tokenId), _msgSender(), tokenId, "");
		
		if (_msgValue() > costs[tokenId])
		{
			payable(_msgSender()).transfer(_msgValue() - costs[tokenId]);
		}
		payable(prevOwner).transfer(costs[tokenId] - costs[tokenId] * royalty / denominator);
		payable(owner()).transfer(address(this).balance);
	}

	function _msgValue() internal
	returns (uint256)
	{
		return msg.value;
	}

}
