// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract YourCollectible is
	ERC721,
	ERC721Enumerable,
	ERC721URIStorage,
	Ownable,
	ReentrancyGuard
{
	using Counters for Counters.Counter;

	Counters.Counter public tokenIdCounter;

	// 累计的上架费用
	uint256 public totalFeesCollected;

	// NFT结构体
	struct NftItem {
		uint256 tokenId;
		uint256 price;
		address payable seller;
		bool isListed;
		string tokenUri;
		uint256 endTime;
		address payable royaltyReceiver; // 新增：版税接收者
		uint256 royaltyPercentage; // 新增：版税比例
	}

	// 拍卖记录结构体
	struct Auction {
		uint256 tokenId;
		uint256 startingPrice;
		uint256 highestBid;
		address payable highestBidder;
		address payable seller;
		uint256 startTime;
		uint256 endTime;
		bool isActive;
		uint256 minBidIncrement; // 最低加价
		address payable royaltyReceiver; // 版税接收者
		uint256 royaltyPercentage; // 版税比例
		string tokenUri; // NFT 的 URI
	}

	// 竞价信息记录结构体，包含出价相关关键信息
	struct BidRecord {
		uint256 tokenId;
		address bidder;
		uint256 bidAmount;
		uint256 bidTime;
	}

	// 存储所有的竞价信息记录
	BidRecord[] public bidRecords;
	// 按照tokenId映射对应的竞价信息记录数组，方便按NFT查询其所有竞价记录
	mapping(uint256 => BidRecord[]) public bidRecordsByTokenId;

	// 购买信息记录结构体
	struct PurchaseRecord {
		uint256 tokenId;
		address buyer;
		address seller; // 最初上架者
		uint256 price;
		string tokenUri;
		uint256 timestamp;
		address royaltyReceiver; // 版税收取者
		uint256 royaltyAmount; // 版税金额
	}

	// 存储所有的购买记录
	PurchaseRecord[] public purchaseRecords;
	// 根据ID查询购买记录
	mapping(uint256 => PurchaseRecord[]) public purchaseRecordsByTokenId;

	// Token ID到NftItem的映射
	mapping(uint256 => NftItem) private _idToNftItem;
	// Token ID到Auction的映射
	mapping(uint256 => Auction) private _idToAuction;

	// 维护所有上架的tokenId数组
	uint256[] private _listedTokenIds;
	// tokenId到_listedTokenIds数组索引的映射
	mapping(uint256 => uint256) private _tokenIdToListedIndex;

	// 维护所有拍卖中的tokenId数组
	uint256[] private _auctionTokenIds;
	// tokenId到_auctionTokenIds数组索引的映射
	mapping(uint256 => uint256) private _tokenIdToAuctionIndex;

	//用于存储每个创作者（地址）所铸造拥有的 NFT 的 tokenId 列表，方便后续判断出价者是否为 NFT 的创作者。
	mapping(address => uint256[]) private creatorToOwnedTokenIds;

	// 上架费用比例（例如250代表2.5%）
	uint256 public listingFeePercentage = 250; // 2.5%
	uint256 public constant MAX_LISTING_FEE_PERCENTAGE = 1000; // 最多10%

	// 版税
	uint256 public defaultRoyaltyPercentage = 500; // 默认5%
	uint256 public constant MAX_ROYALTY_PERCENTAGE = 1000; // 最多10%

	// 事件
	event NftListed(
		uint256 indexed tokenId,
		address indexed seller,
		uint256 price,
		uint256 endTime
	);

	event NftUnlisted(uint256 indexed tokenId, address indexed seller);
	event NftPurchased(
		uint256 indexed tokenId,
		address indexed buyer,
		address indexed seller,
		uint256 price,
		address royaltyReceiver,
		uint256 royaltyAmount
	);

	event AuctionCreated(
		uint256 indexed tokenId,
		address indexed seller,
		uint256 startingPrice,
		uint256 minBidIncrement,
		uint256 startTime,
		uint256 endTime
	);
	event BidPlaced(
		uint256 indexed tokenId,
		address indexed bidder,
		uint256 bidAmount
	);
	event AuctionEnded(
		uint256 indexed tokenId,
		address indexed winner,
		uint256 winningBid
	);

	constructor() ERC721("YourCollectible", "YCB") {}

	function _baseURI() internal pure override returns (string memory) {
		return "https://chocolate-rear-pony-291.mypinata.cloud/ipfs/";
	}

	/**
	 * @dev 铸造新的NFT
	 * @param to 接收者地址
	 * @param uri NFT的元数据URI
	 * @return tokenId 新铸造的NFT的Token ID
	 */
	function mintItem(
		address to,
		string memory uri,
		uint256 royaltyPercentage
	) public returns (uint256) {
		require(
			royaltyPercentage <= MAX_ROYALTY_PERCENTAGE ||
				royaltyPercentage == 0,
			"Royalty fee cannot exceed 10% or be 0 for default"
		);

		tokenIdCounter.increment();
		uint256 tokenId = tokenIdCounter.current();
		_safeMint(to, tokenId);
		_setTokenURI(tokenId, uri);

		// 拼接完整的 tokenURI
		string memory completeTokenURI = string(
			abi.encodePacked(_baseURI(), uri)
		);

		// 如果用户没有提供版税百分比，使用默认值
		if (royaltyPercentage == 0) {
			royaltyPercentage = defaultRoyaltyPercentage;
		}

		_idToNftItem[tokenId] = NftItem({
			tokenId: tokenId,
			price: 0,
			seller: payable(address(0)),
			isListed: false,
			tokenUri: completeTokenURI,
			endTime: 0, // 设置endTime为0，表示NFT尚未上架
			royaltyReceiver: payable(to), // 版税接收者为铸币者
			royaltyPercentage: royaltyPercentage // 使用默认版税比例
		});

		emit NftUnlisted(tokenId, address(0)); // 或其他适当的事件

		return tokenId;
	}

	// 读取版税的比例
	function getRoyaltyPercentage(
		uint256 tokenId
	) public view returns (uint256) {
		return _idToNftItem[tokenId].royaltyPercentage;
	}

	/**
	 * @dev 铸造盲盒NFT
	 * @param to 接收者地址
	 * @param uri NFT的元数据URI
	 * @param royaltyPercentage 版税百分比
	 * @return tokenId 新铸造的NFT的Token ID
	 */
	function mintBlindboxItem(
		address to,
		string memory uri,
		uint256 royaltyPercentage
	) public payable returns (uint256) {
		require(msg.value == 3 ether, "Minting requires exactly 3 ETH");
		require(
			royaltyPercentage <= MAX_ROYALTY_PERCENTAGE ||
				royaltyPercentage == 0,
			"Royalty fee cannot exceed 10% or be 0 for default"
		);
		tokenIdCounter.increment();
		uint256 tokenId = tokenIdCounter.current();
		_safeMint(to, tokenId);
		_setTokenURI(tokenId, uri);

		// 拼接完整的 tokenURI
		string memory completeTokenURI = string(
			abi.encodePacked(_baseURI(), uri)
		);

		// 如果用户没有提供版税百分比，使用默认值
		if (royaltyPercentage == 0) {
			royaltyPercentage = defaultRoyaltyPercentage;
		}

		_idToNftItem[tokenId] = NftItem({
			tokenId: tokenId,
			price: 0,
			seller: payable(address(0)),
			isListed: false,
			tokenUri: completeTokenURI,
			endTime: 0, // 设置endTime为0，表示NFT尚未上架
			royaltyReceiver: payable(to), // 版税接收者为铸币者
			royaltyPercentage: royaltyPercentage // 使用默认版税比例
		});

		emit NftUnlisted(tokenId, address(0)); // 或其他适当的事件

		return tokenId;
	}

// 碎片化铸造NFT
	function mintDebris(
		address to,
		string[9] memory uris,
		uint256 royaltyPercentage
	) public returns (uint256[9] memory) {
		uint256[9] memory tokenIds;

		for (uint256 i = 0; i < 9; i++) {
			// 每个 URI 对应一个独立的 NFT
			tokenIdCounter.increment();
			uint256 tokenId = tokenIdCounter.current();
			_safeMint(to, tokenId);
			_setTokenURI(tokenId, uris[i]);

			string memory completeTokenURI = string(
				abi.encodePacked(_baseURI(), uris[i])
			);
			_idToNftItem[tokenId] = NftItem({
				tokenId: tokenId,
				price: 0,
				seller: payable(address(0)),
				isListed: false,
				tokenUri: completeTokenURI,
				endTime: 0, // 设置endTime为0，表示NFT尚未上架
				royaltyReceiver: payable(to), // 版税接收者为铸币者
				royaltyPercentage: royaltyPercentage // 使用默认版税比例
			});
		}
		emit NftUnlisted(tokenIds[0], address(0)); 
		return tokenIds;
	}

	/**
	 * @dev 批量铸造NFT
	 * @param to 接收者地址
	 * @param uris NFT的元数据URI数组
	 * @param royaltyPercentage 版税比例（Basis Points，1% = 100）
	 * @return mintedTokenIds 新铸造的NFT的Token ID数组
	 */
	function mintBatch(
		address to,
		string[] memory uris,
		uint256 royaltyPercentage
	) public returns (uint256[] memory) {
		uint256 quantity = uris.length;
		require(quantity > 0, "Quantity must be greater than 0");
		require(quantity <= 20, "Exceeded max batch size of 20");

		uint256[] memory mintedTokenIds = new uint256[](quantity);

		for (uint256 i = 0; i < quantity; i++) {
			tokenIdCounter.increment();
			uint256 tokenId = tokenIdCounter.current();
			_safeMint(to, tokenId);
			_setTokenURI(tokenId, uris[i]);
			_idToNftItem[tokenId] = NftItem({
				tokenId: tokenId,
				price: 0,
				seller: payable(address(0)),
				isListed: false,
				tokenUri: uris[i],
				endTime: 0,
				royaltyReceiver: payable(to),
				royaltyPercentage: royaltyPercentage
			});
			mintedTokenIds[i] = tokenId;

			// 将NFT转移到合约中进行托管
			// _transfer(msg.sender, address(this), tokenId);
		}

		return mintedTokenIds;
	}

	/**
	 * @dev 将NFT上架（支持盲拍）
	 * @param tokenId 要上架的NFT的Token ID
	 * @param price 上架的价格，单位为wei
	 * @param duration 上架持续时间，单位为秒
	 * @param isBlind 是否启用盲拍模式
	 */
	function placeNftOnSale(
		uint256 tokenId,
		uint256 price,
		uint256 duration,
		bool isBlind
	) external payable nonReentrant {
		require(price > 0, "Price must be at least 1 wei");
		require(
			ownerOf(tokenId) == msg.sender,
			"You are not the owner of this NFT"
		);
		require(!_idToNftItem[tokenId].isListed, "Item is already on sale");
		require(
			msg.value == calculateListingFee(price),
			"Incorrect listing fee"
		);

		// 计算结束时间
		uint256 endTime = block.timestamp + duration;

		// 将NFT转移到合约中进行托管
		_transfer(msg.sender, address(this), tokenId);

		// 从合约中读取已经设置的版税比例
		uint256 royaltyPercentage = _idToNftItem[tokenId].royaltyPercentage;

		// 设置盲拍模式下的URI
		string memory hiddenUri = isBlind ? "???" : tokenURI(tokenId);

		// 更新NftItem信息
		_idToNftItem[tokenId] = NftItem({
			tokenId: tokenId,
			price: price,
			seller: payable(msg.sender),
			isListed: true,
			tokenUri: hiddenUri, // 如果是盲拍，则设置为隐藏信息
			endTime: endTime, // 设置结束时间
			royaltyReceiver: _idToNftItem[tokenId].royaltyReceiver,
			royaltyPercentage: royaltyPercentage
		});

		// 将tokenId添加到listedTokenIds数组，并记录其索引
		_listedTokenIds.push(tokenId);
		_tokenIdToListedIndex[tokenId] = _listedTokenIds.length - 1;

		totalFeesCollected += msg.value;

		emit NftListed(tokenId, msg.sender, price, endTime);
	}

	// 内部函数，用于处理下架逻辑
	function _unlistNft(uint256 tokenId, bool emitEvent) internal {
		NftItem storage item = _idToNftItem[tokenId];
		require(item.isListed, "Item is not listed");
		require(item.seller != address(0), "Invalid seller");

		// 将NFT转回卖家
		_transfer(address(this), item.seller, tokenId);

		// 重置NftItem信息
		item.isListed = false;
		item.price = 0;
		item.seller = payable(address(0));

		// 从listedTokenIds数组中移除tokenId
		_removeFromListed(tokenId);

		if (emitEvent) {
			emit NftUnlisted(tokenId, item.seller);
		}
	}

	/**
	 * @dev 将NFT下架
	 * @param tokenId 要下架的NFT的Token ID
	 */
	function unlistNft(uint256 tokenId) external nonReentrant {
		NftItem storage item = _idToNftItem[tokenId];
		require(item.isListed, "Item is not listed");
		require(item.seller == msg.sender, "You are not the seller");

		// 将NFT转回卖家
		_transfer(address(this), msg.sender, tokenId);

		// 重置NftItem信息
		item.isListed = false;
		item.price = 0;
		item.seller = payable(address(0));

		// 从listedTokenIds数组中移除tokenId
		_removeFromListed(tokenId);

		emit NftUnlisted(tokenId, msg.sender);
	}

	/**
	 * @dev 创建拍卖
	 * @param tokenId 要拍卖的NFT的Token ID
	 * @param startingPrice 拍卖的起拍价格，单位为wei
	 * @param minBidIncrement 最低加价，单位为wei
	 * @param duration 拍卖持续时间，单位为秒
	 */
	function createAuction(
		uint256 tokenId,
		uint256 startingPrice,
		uint256 minBidIncrement,
		uint256 duration
	) external payable nonReentrant {
		require(startingPrice > 0, "Starting price must be at least 1 wei");
		require(
			minBidIncrement > 0,
			"Minimum bid increment must be at least 1 wei"
		);
		require(
			ownerOf(tokenId) == msg.sender,
			"You are not the owner of this NFT"
		);
		require(!_idToAuction[tokenId].isActive, "Auction already active");
		require(
			msg.value == calculateListingFee(startingPrice),
			"Incorrect listing fee"
		);

		// 获取NFT的tokenUri
		string memory tokenUri = tokenURI(tokenId);

		// 计算开始时间和结束时间
		uint256 startTime = block.timestamp;
		uint256 endTime = block.timestamp + duration;

		// 将NFT转移到合约中进行托管
		_transfer(msg.sender, address(this), tokenId);

		// 从合约中读取已经设置的版税比例
		uint256 royaltyPercentage = _idToNftItem[tokenId].royaltyPercentage;

		// 创建拍卖信息
		_idToAuction[tokenId] = Auction({
			tokenId: tokenId,
			startingPrice: startingPrice,
			highestBid: 0,
			highestBidder: payable(address(0)),
			seller: payable(msg.sender),
			startTime: startTime,
			endTime: endTime,
			isActive: true,
			minBidIncrement: minBidIncrement,
			royaltyReceiver: _idToNftItem[tokenId].royaltyReceiver, // 版税接收者为铸币者
			royaltyPercentage: royaltyPercentage, // 使用铸币时设置的版税比例
			tokenUri: tokenUri // 存储tokenUri
		});

		// 将tokenId添加到auctionTokenIds数组，并记录其索引
		_auctionTokenIds.push(tokenId);
		_tokenIdToAuctionIndex[tokenId] = _auctionTokenIds.length - 1;

		// 记录创作者与所铸造NFT的对应关系，将tokenId添加到创作者对应的列表中
		creatorToOwnedTokenIds[msg.sender].push(tokenId);

		totalFeesCollected += msg.value;

		emit AuctionCreated(
			tokenId,
			msg.sender,
			startingPrice,
			minBidIncrement,
			startTime,
			endTime
		);
	}

	/**
	 * @dev 参与拍卖出价
	 * @param tokenId 要参与拍卖的NFT的Token ID
	 */
	function placeBid(uint256 tokenId) external payable nonReentrant {
		Auction storage auction = _idToAuction[tokenId];
		require(auction.isActive, "Auction is not active");
		require(block.timestamp < auction.endTime, "Auction has ended");
		require(
			msg.value >= auction.startingPrice,
			"Bid must be at least the starting price"
		);
		require(
			msg.value >= auction.highestBid + auction.minBidIncrement,
			"Bid must be higher than current highest bid by at least the minimum bid increment"
		);

		// 判断当前出价者是否是该NFT的创作者，若是则禁止出价
		require(
			!isTokenCreator(msg.sender, tokenId),
			"Cannot bid on your own minted NFT"
		);

		// 检查NFT是否已经过期
		if (auction.endTime > 0 && block.timestamp >= auction.endTime) {
			// 如果NFT已经过期，则下架NFT
			_unlistNft(tokenId, true);
			revert("NFT has expired and is no longer available for purchase");
		}

		// 如果已经有最高出价者，退还之前的出价
		if (auction.highestBidder != address(0)) {
			payable(auction.highestBidder).transfer(auction.highestBid);
		}

		// 更新最高出价和最高出价者
		auction.highestBid = msg.value;
		auction.highestBidder = payable(msg.sender);

		// 记录此次出价的信息作为一条竞价记录
		BidRecord memory newBidRecord = BidRecord({
			tokenId: tokenId,
			bidder: msg.sender,
			bidAmount: msg.value,
			bidTime: block.timestamp
		});
		bidRecords.push(newBidRecord);
		bidRecordsByTokenId[tokenId].push(newBidRecord);

		emit BidPlaced(tokenId, msg.sender, msg.value);
	}

	/**
	 * @dev 结束拍卖
	 * @param tokenId 要结束拍卖的NFT的Token ID
	 */
	// 结束拍卖的自动触发函数
	function autoEndAuction(uint256 tokenId) external nonReentrant {
		Auction storage auction = _idToAuction[tokenId];
		require(auction.isActive, "Auction is not active");
		require(
			block.timestamp >= auction.endTime,
			"Auction has not ended yet"
		);
		require(auction.seller == msg.sender, "You are not the seller");

		// 如果有最高出价者，则完成交易
		if (auction.highestBidder != address(0)) {
			// 计算版税
			uint256 royaltyAmount = (auction.highestBid *
				auction.royaltyPercentage) / 10000;
			uint256 sellerProceeds = auction.highestBid - royaltyAmount;

			// 支付版税给版税接收者
			auction.royaltyReceiver.transfer(royaltyAmount);

			// 支付剩余款项给卖家
			auction.seller.transfer(sellerProceeds);

			// 记录购买记录
			purchaseRecords.push(
				PurchaseRecord({
					tokenId: tokenId,
					buyer: auction.highestBidder,
					seller: auction.seller,
					price: auction.highestBid,
					tokenUri: tokenURI(tokenId),
					timestamp: block.timestamp,
					royaltyReceiver: auction.royaltyReceiver,
					royaltyAmount: royaltyAmount
				})
			);
			purchaseRecordsByTokenId[tokenId].push(
				purchaseRecords[purchaseRecords.length - 1]
			);

			// 将NFT转移给最高出价者
			_transfer(address(this), auction.highestBidder, tokenId);

			emit NftPurchased(
				tokenId,
				auction.highestBidder,
				auction.seller,
				auction.highestBid,
				auction.royaltyReceiver,
				royaltyAmount
			);
		} else {
			// 如果没有最高出价者，则将NFT归还给卖家
			_transfer(address(this), auction.seller, tokenId);
		}

		// 清理拍卖信息
		auction.isActive = false;

		// 从auctionTokenIds数组中移除tokenId
		_removeFromAuctions(tokenId);

		emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid);
	}

	/**
	 * @dev 获取拍卖信息
	 * @param tokenId 要获取拍卖信息的NFT的Token ID
	 * @return auction 拍卖的详细信息
	 */
	function getAuctionInfo(
		uint256 tokenId
	) external view returns (Auction memory) {
		return _idToAuction[tokenId];
	}

	// 查询指定NFT的所有竞价信息记录
	function getBidRecordsByTokenId(
		uint256 tokenId
	) external view returns (BidRecord[] memory) {
		return bidRecordsByTokenId[tokenId];
	}

	// 获取活跃的NFT拍卖ID
	function getActiveAuctionIds() external view returns (uint256[] memory) {
		uint256 activeCount = 0;
		for (uint256 i = 0; i < _auctionTokenIds.length; i++) {
			if (_idToAuction[_auctionTokenIds[i]].isActive) {
				activeCount++;
			}
		}

		uint256[] memory activeIds = new uint256[](activeCount);
		uint256 index = 0;
		for (uint256 i = 0; i < _auctionTokenIds.length; i++) {
			if (_idToAuction[_auctionTokenIds[i]].isActive) {
				activeIds[index] = _auctionTokenIds[i];
				index++;
			}
		}

		return activeIds;
	}

	// 辅助函数，用于判断某个地址是否是指定tokenId的NFT的创作者（即判断是否是自己铸造的NFT）
	function isTokenCreator(
		address _address,
		uint256 _tokenId
	) internal view returns (bool) {
		// 遍历该地址对应的tokenId列表，看是否包含当前要判断的_tokenId
		uint256[] storage ownedTokenIds = creatorToOwnedTokenIds[_address];
		for (uint256 i = 0; i < ownedTokenIds.length; i++) {
			if (ownedTokenIds[i] == _tokenId) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @dev 购买NFT
	 * @param tokenId 要购买的NFT的Token ID
	 */
	function purchaseNft(uint256 tokenId) external payable nonReentrant {
		NftItem storage item = _idToNftItem[tokenId];

		// 检查NFT是否上架
		require(item.isListed, "Item is not listed for sale");

		// 检查支付金额是否正确
		require(msg.value >= item.price, "Payment must be exactly the price");

		// 检查买家是否不是卖家
		require(item.seller != msg.sender, "You are the seller");

		// 检查NFT是否已经过期
		if (item.endTime > 0 && block.timestamp >= item.endTime) {
			// 如果NFT已经过期，则下架NFT
			_unlistNft(tokenId, true);
			revert("NFT has expired and is no longer available for purchase");
		}

		// 计算版税
		uint256 royaltyFee = calculateRoyalty(tokenId, msg.value);

		// 支付版税
		payable(item.royaltyReceiver).transfer(royaltyFee);

		// 取消上架并更新状态
		item.isListed = false;
		uint256 salePrice = item.price; // 保存价格
		item.price = 0;
		address sellerAddress = item.seller; // 保存卖家的地址
		item.seller = payable(address(0));

		// 从listedTokenIds数组中移除tokenId
		uint256 lastIndex = _listedTokenIds.length - 1;
		uint256 lastTokenId = _listedTokenIds[lastIndex];
		_listedTokenIds[_tokenIdToListedIndex[tokenId]] = lastTokenId;
		_listedTokenIds.pop();
		_tokenIdToListedIndex[lastTokenId] = _tokenIdToListedIndex[tokenId];
		delete _tokenIdToListedIndex[tokenId];

		// 将ETH转给卖家
		(bool success, ) = sellerAddress.call{ value: msg.value - royaltyFee }(
			""
		);
		require(success, "Transfer to seller failed");

		// 将NFT转给买家
		_transfer(address(this), msg.sender, tokenId);

		// 记录购买信息
		PurchaseRecord memory newRecord = PurchaseRecord({
			tokenId: tokenId,
			buyer: msg.sender,
			seller: sellerAddress, // 记录卖家的地址
			price: salePrice,
			tokenUri: item.tokenUri,
			timestamp: block.timestamp,
			royaltyReceiver: item.royaltyReceiver, // 记录版税收取者
			royaltyAmount: royaltyFee // 记录版税金额
		});

		purchaseRecords.push(newRecord);
		purchaseRecordsByTokenId[tokenId].push(newRecord);

		emit NftPurchased(
			tokenId,
			msg.sender,
			sellerAddress,
			salePrice,
			item.royaltyReceiver,
			royaltyFee
		);
	}

	/**
	 * @dev 计算版税费用
	 *
	 */
	function calculateRoyalty(
		uint256 tokenId,
		uint256 amount
	) internal view returns (uint256) {
		NftItem storage item = _idToNftItem[tokenId];
		return (amount * item.royaltyPercentage) / 10000;
	}

	
	// 根据ID查询购买记录
	function getPurchaseRecordsByTokenId(
		uint256 _tokenId
	) external view returns (PurchaseRecord[] memory) {
		return purchaseRecordsByTokenId[_tokenId];
	}

	/**
	 * @dev 获取NftItem信息
	 * @param tokenId 要查询的NFT的Token ID
	 * @return NftItem结构体
	 */
	function getNftItem(uint256 tokenId) public view returns (NftItem memory) {
		return _idToNftItem[tokenId];
	}

	/**
	 * @dev 从上架列表中移除tokenId
	 * @param tokenId 要移除的tokenId
	 */
	function _removeFromListed(uint256 tokenId) internal {
		uint256 index = _tokenIdToListedIndex[tokenId];
		uint256 lastTokenId = _listedTokenIds[_listedTokenIds.length - 1];

		// 将要移除的tokenId与最后一个tokenId交换
		_listedTokenIds[index] = lastTokenId;
		_tokenIdToListedIndex[lastTokenId] = index;

		// 删除最后一个元素
		_listedTokenIds.pop();

		// 删除映射中的条目
		delete _tokenIdToListedIndex[tokenId];
	}

	// 移除正在进行拍卖的NFT
	function _removeFromAuctions(uint256 tokenId) internal {
		uint256 lastIndex = _auctionTokenIds.length - 1;
		uint256 lastTokenId = _auctionTokenIds[lastIndex];
		uint256 indexToRemove = _tokenIdToAuctionIndex[tokenId];

		// 将最后一个元素移动到要删除的位置
		_auctionTokenIds[indexToRemove] = lastTokenId;
		_tokenIdToAuctionIndex[lastTokenId] = indexToRemove;

		// 删除最后一个元素
		_auctionTokenIds.pop();
	}

	/**
	 * @dev 获取所有上架的NFT
	 * @return An array of NftItem structs
	 */
	function getAllListedNfts() external view returns (NftItem[] memory) {
		uint256 totalListed = _listedTokenIds.length;
		NftItem[] memory items = new NftItem[](totalListed);
		for (uint256 i = 0; i < totalListed; i++) {
			uint256 tokenId = _listedTokenIds[i];
			items[i] = _idToNftItem[tokenId];
		}
		return items;
	}

	//Merkle Root 存储
	bytes32 public merkleRoot; //记录每个地址是否已经领取了空投
	mapping(address => bool) public hasClaimed;

	//允许管理员设置MerkleRoot，用于验证白名单或空投等功能
	function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
		merkleRoot = _merkleRoot;
	}

	// 领取空头方法
	function claimNFT(
		bytes32[] calldata merkleProof,
		uint256 tokenId,
		address owner
	) external {
		require(!hasClaimed[msg.sender], "NFT already claimed");
		bytes32 leaf = keccak256(abi.encodePacked(msg.sender, tokenId));

		require(
			MerkleProof.verify(merkleProof, merkleRoot, leaf),
			"Invalid proof"
		);

		// 确认当前所有者是提供的所有者地址
		require(
			ownerOf(tokenId) == owner,
			"Provided owner does not match actual owner"
		);

		hasClaimed[msg.sender] = true;
		// 从合约拥有者 ————》 请求者 领取的人 转移NFT
		_safeTransfer(owner, msg.sender, tokenId, "");
	}

	/**
	 * @dev 计算上架费用
	 * @param priceInWei NFT的售价，单位为wei
	 * @return fee 上架费用，单位为wei
	 */
	function calculateListingFee(
		uint256 priceInWei
	) public view returns (uint256) {
		uint256 fee = (priceInWei * listingFeePercentage) / 10000;
		return fee;
	}

	function _beforeTokenTransfer(
		address from,
		address to,
		uint256 tokenId,
		uint256 batchSize
	) internal override(ERC721, ERC721Enumerable) {
		super._beforeTokenTransfer(from, to, tokenId, batchSize);
	}

	function _burn(
		uint256 tokenId
	) internal override(ERC721, ERC721URIStorage) {
		super._burn(tokenId);
	}

	// 销毁NFT
	function burn(uint256 tokenId) external {
		require(
			ownerOf(tokenId) == msg.sender,
			"You are not the owner of this NFT"
		);
		_burn(tokenId);
	}

	function tokenURI(
		uint256 tokenId
	) public view override(ERC721, ERC721URIStorage) returns (string memory) {
		return super.tokenURI(tokenId);
	}

	function supportsInterface(
		bytes4 interfaceId
	)
		public
		view
		override(ERC721, ERC721Enumerable, ERC721URIStorage)
		returns (bool)
	{
		return super.supportsInterface(interfaceId);
	}
}
