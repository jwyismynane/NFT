"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import Link from "next/link";

const getMetadataFromTokenURI = async (tokenURI: string) => {
  try {
    const response = await fetch(tokenURI);
    const metadata = await response.json();
    return metadata;
  } catch (error) {
    console.error("Failed to fetch or parse NFT metadata", error);
    return null;
  }
};

const formatTime = (seconds: number) => {
  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds %= 24 * 60 * 60;
  const hours = Math.floor(seconds / (60 * 60));
  seconds %= 60 * 60;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  return `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
};

const Marketplace: NextPage = () => {
  const { isConnected, isConnecting } = useAccount();
  const [nftMetadata, setNftMetadata] = useState({});
  const [remainingTimes, setRemainingTimes] = useState({});
  const [auctionStatus, setAuctionStatus] = useState({}); // 用来存储每个NFT的拍卖状态
  const [searchTerm, setSearchTerm] = useState(""); // 搜索关键字
  const [filteredItems, setFilteredItems] = useState([]); // 过滤后的NFT列表
  const fallbackImage = "/gift-placeholder.jpg"; // 自定义图片路径

  const { data: listedItems } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAllListedNfts",
    watch: true,
  });

  useEffect(() => {
    if (listedItems) {
      Promise.all(listedItems.map(async (item) => {
        const metadata = await getMetadataFromTokenURI(item.tokenUri);
        if (metadata) {
          setNftMetadata((prevMetadata) => ({ ...prevMetadata, [item.tokenId]: metadata }));
        }

        // 获取拍卖状态信息
        const auctionInfo = await useScaffoldReadContract({
          contractName: "YourCollectible",
          functionName: "getAuctionInfo",
          args: [item.tokenId],
          watch: false,
        }).data;

        if (auctionInfo) {
          const isAuctionActive = Number(auctionInfo.endTime) > Math.floor(Date.now() / 1000);
          setAuctionStatus((prevStatus) => ({
            ...prevStatus,
            [item.tokenId]: isAuctionActive ? "拍卖中" : "已结束",
          }));
        }
      })).catch(console.error);
    }
  }, [listedItems]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

      const newRemainingTimes = {};

      if (listedItems) {
        listedItems.forEach((item) => {
          const remainingTime = Number(item.endTime - currentTimestamp);

          if (remainingTime > 0) {
            newRemainingTimes[item.tokenId] = remainingTime;
          }
        });
      }

      setRemainingTimes(newRemainingTimes);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [listedItems]);

  // 处理搜索逻辑
  useEffect(() => {
    if (!listedItems) return;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = listedItems.filter((item) => {
      const metadata = nftMetadata[item.tokenId];
      return !searchTerm || metadata?.name?.toLowerCase().includes(lowerCaseSearchTerm);
    });
    setFilteredItems(filtered);
  }, [searchTerm, listedItems, nftMetadata]);

  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
  const activeListedItems = listedItems?.filter((item) => item.endTime > currentTimestamp) || [];

  // 使用 filteredItems 而不是 activeListedItems 进行渲染
  const displayedItems = searchTerm ? filteredItems : activeListedItems;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-1000 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">NFT Marketplace</h1>
      {!isConnected || isConnecting ? (
        <div className="flex justify-center mt-8">
          <RainbowKitCustomConnectButton />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search NFTs by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full p-2 border rounded"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedItems.length > 0 ? (
              displayedItems.map((item) => (
                <div key={item.tokenId} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  <Link href={`/NFTMarketTrading?tokenId=${item.tokenId}`} className="block">
                    <div className="aspect-square relative">
                      {nftMetadata[item.tokenId]?.image ? (
                        <img
                          src={nftMetadata[item.tokenId].image}
                          alt={nftMetadata[item.tokenId]?.name || `NFT #${item.tokenId}`}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = fallbackImage)}
                        />
                      ) : (
                        <img
                          src={fallbackImage}
                          alt="Hidden NFT"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="text-xl font-semibold text-gray-800">
                        {nftMetadata[item.tokenId]?.name || `NFT #${item.tokenId}`}
                      </h2>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {nftMetadata[item.tokenId]?.description || "No description available"}
                      </p>
                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-sm text-red-500">剩余时间 : {formatTime(remainingTimes[item.tokenId] || 0)}</span>
                        <span className="text-sm text-gray-500">
                          {auctionStatus[item.tokenId] || "正常销售"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 py-12">
                No NFTs listed for sale or matching your search criteria.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;