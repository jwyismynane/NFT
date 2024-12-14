"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Zap } from 'lucide-react';
import { NextPage } from "next";
import { Address } from "~~/components/scaffold-eth";

// 从 tokenURI 获取元数据
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

// 格式化时间
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
  const [minPrice, setMinPrice] = useState(""); // 最低价格
  const [maxPrice, setMaxPrice] = useState(""); // 最高价格
  const [selectedSaleType, setSelectedSaleType] = useState("all"); // 销售类型
  const [sellerAddress, setSellerAddress] = useState(""); // 创作者地址
  const [filteredItems, setFilteredItems] = useState([]); // 过滤后的NFT列表
  const fallbackImage = "/gift-placeholder.jpg"; // 自定义图片路径

  const { data: listedItems } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAllListedNfts",
    watch: true,
  });

  // 获取NFT元数据和拍卖状态
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

  // 更新剩余时间
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
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = listedItems.filter((item) => {
      const metadata = nftMetadata[item.tokenId];
      // 名称匹配
      const nameMatch = !searchTerm || metadata?.name?.toLowerCase().includes(lowerCaseSearchTerm);
      // 价格匹配
      const priceMatch = (!minPrice || Number(item.price) >= Number(minPrice)) &&
                         (!maxPrice || Number(item.price) <= Number(maxPrice));
      // 销售类型匹配
      const saleTypeMatch = selectedSaleType === "all" || item.Listingmethod === selectedSaleType;
      // 创作者地址匹配
      const sellerMatch = !sellerAddress || item.seller.toLowerCase() === sellerAddress.toLowerCase();
      // 检查是否过期
      const isNotExpired = item.endTime > currentTimestamp;
      
      return nameMatch && priceMatch && saleTypeMatch && sellerMatch && isNotExpired;
    });
    setFilteredItems(filtered);
  }, [searchTerm, listedItems, nftMetadata, minPrice, maxPrice, selectedSaleType, sellerAddress]);

  // 获取当前有效的NFT列表
  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
  const activeListedItems = listedItems?.filter((item) => item.endTime > currentTimestamp) || [];

  // 使用 filteredItems 进行渲染
  const displayedItems = searchTerm ? filteredItems : activeListedItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 p-6">
      <motion.h1 
        className="text-4xl md:text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        NFT 奇幻市场
      </motion.h1>
      {!isConnected || isConnecting ? (
        <div className="flex justify-center mt-8">
          <RainbowKitCustomConnectButton />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <input
                type="text"
                placeholder="搜索炫酷的 NFT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full p-4 pr-12 border-2 border-purple-300 rounded-full bg-white bg-opacity-80 backdrop-blur-sm text-purple-800 placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-500" />
            </div>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedItems.length > 0 ? (
              displayedItems.map((item, index) => (
                <motion.div 
                  key={item.tokenId} 
                  className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/NFTMarketTrading?tokenId=${item.tokenId}`} className="block">
                    <div className="aspect-square relative overflow-hidden">
                      {nftMetadata[item.tokenId]?.image ? (
                        <img
                          src={nftMetadata[item.tokenId].image}
                          alt={nftMetadata[item.tokenId]?.name || `NFT #${item.tokenId}`}
                          className="w-full h-full object-cover transform transition-transform duration-300 hover:scale-110"
                          onError={(e) => (e.currentTarget.src = fallbackImage)}
                        />
                      ) : (
                        <img
                          src={fallbackImage}
                          alt="Hidden NFT"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-2 right-2 bg-yellow-400 text-purple-800 rounded-full px-3 py-1 text-xs font-bold">
                        #{item.tokenId}
                      </div>
                    </div>
                    <div className="p-6">
                      <h2 className="text-2xl font-bold text-purple-800 mb-2">
                        {nftMetadata[item.tokenId]?.name || `炫酷 NFT #${item.tokenId}`}
                      </h2>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                        {nftMetadata[item.tokenId]?.description || "描述即将揭晓，敬请期待！"}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-red-500 flex items-center">
                          <Zap className="w-4 h-4 mr-1" />
                          剩余: {formatTime(remainingTimes[item.tokenId] || 0)}
                        </span>
                        <span className="text-sm font-medium px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                          {auctionStatus[item.tokenId] || "正常销售"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <motion.div 
                className="col-span-full text-center text-white py-12 text-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                哎呀！没有找到符合条件的 NFT。再试试其他搜索词吧！
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;

