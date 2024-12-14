"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import Image from "next/image";
import { motion } from "framer-motion";
import { Gift, Star, User, Clock, Zap } from 'lucide-react';

const NFTMarketTrading: NextPage = () => {
  const [nftMetadata, setNftMetadata] = useState<any>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isBlindAuction, setIsBlindAuction] = useState<boolean>(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenId = searchParams.get("tokenId");
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  const { data: nftItem } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getNftItem",
    args: [BigInt(tokenId)],
    watch: true,
  });

  const { data: purchaseRecords, isLoading: isPurchaseRecordsLoading } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getPurchaseRecordsByTokenId",
    args: [BigInt(tokenId)],
    watch: true,
  });

  useEffect(() => {
    if (nftItem) {
      const blindAuction = nftItem.tokenUri === "???";
      setIsBlindAuction(blindAuction);

      if (!blindAuction && nftItem?.tokenUri) {
        fetch(nftItem.tokenUri)
          .then((response) => response.json())
          .then((metadata) => setNftMetadata(metadata))
          .catch((error) => console.error("Failed to fetch metadata:", error));
      }
    }
  }, [nftItem]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (nftItem?.endTime) {
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
        const remainingTime = Number(nftItem.endTime - currentTimestamp);
        setRemainingTime(remainingTime);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [nftItem]);

  const handleBuyItem = async (tokenId: number, price: string) => {
    const notificationId = notification.loading("Processing transaction...");
    const priceInWei = BigInt(price) * BigInt(10) ** BigInt(18);
    try {
      await writeContractAsync({
        functionName: "purchaseNft",
        args: [tokenId],
        value: priceInWei,
      });
      notification.remove(notificationId);
      notification.success("Purchase successful");
    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
      notification.error("Purchase failed");
    }
  };

  const convertWeiToEth = (wei: bigint): string => {
    return (Number(wei) / 10**18).toFixed(2);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-500 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* NFT Details Section */}
        <motion.div 
          className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl p-8 mb-8 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 aspect-square relative rounded-xl overflow-hidden shadow-lg">
              {isBlindAuction ? (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Gift className="w-24 h-24 text-white animate-pulse" />
                </div>
              ) : nftMetadata?.image ? (
                <Image
                  src={nftMetadata.image}
                  alt={nftMetadata.name || `NFT #${tokenId}`}
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform duration-300 hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-12 h-12 text-blue-500" />
                  </motion.div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-blue-800 mb-6">NFT Details</h2>
              <div className="space-y-4">
                <p className="text-gray-700 flex items-center">
                  <span className="bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full mr-2">#{tokenId}</span>
                  Token ID
                </p>
                <p className="text-gray-700 flex items-center">
                  <span className="bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-full mr-2">{nftItem?.price.toString()} ETH</span>
                  Price
                </p>
                {isBlindAuction ? (
                  <p className="text-purple-600 font-semibold flex items-center">
                    <Gift className="w-5 h-5 mr-2" />
                    盲拍：信息隐藏
                  </p>
                ) : (
                  <>
                    <p className="text-gray-700 flex items-center">
                      <Star className="w-5 h-5 mr-2 text-yellow-500" />
                      {nftMetadata?.name}
                    </p>
                    <p className="text-gray-700 flex items-center">
                      <User className="w-5 h-5 mr-2 text-blue-500" />
                      {nftItem?.seller.slice(0, 6)}...{nftItem?.seller.slice(-4)}
                    </p>
                  </>
                )}
                {nftItem?.isListed && (
                  <div className="mt-6">
                    <p className="text-red-600 flex items-center mb-4">
                      <Clock className="w-5 h-5 mr-2" />
                      剩余时间: {formatTime(remainingTime)}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBuyItem(nftItem?.tokenId, nftItem?.price)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Purchase NFT
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trading History Section */}
        <motion.div 
          className="bg-white bg-opacity-30 backdrop-blur-md rounded-2xl p-8 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 text-center">NFT Trading History</h2>
          
          {isPurchaseRecordsLoading ? (
            <div className="flex justify-center">
              <motion.div
                className="w-16 h-16"
                animate={{
                  scale: [1, 2, 2, 1, 1],
                  rotate: [0, 0, 270, 270, 0],
                  borderRadius: ["20%", "20%", "50%", "50%", "20%"],
                }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                  times: [0, 0.2, 0.5, 0.8, 1],
                  repeat: Infinity,
                  repeatDelay: 1
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="px-6 py-3 text-left">Token ID</th>
                    <th className="px-6 py-3 text-left">Buyer</th>
                    <th className="px-6 py-3 text-left">Seller</th>
                    <th className="px-6 py-3 text-right">Price (ETH)</th>
                    <th className="px-6 py-3 text-left">Time</th>
                    <th className="px-6 py-3 text-left">Royalty Receiver</th>
                    <th className="px-6 py-3 text-right">Royalty (ETH)</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRecords?.map((record, index) => (
                    <motion.tr 
                      key={index} 
                      className="bg-white bg-opacity-50 hover:bg-opacity-70 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <td className="px-6 py-4 font-medium">{tokenId}</td>
                      <td className="px-6 py-4">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                          {record.buyer.slice(0, 6)}...{record.buyer.slice(-4)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                          {record.seller.slice(0, 6)}...{record.seller.slice(-4)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">{record.price.toString()}</td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(Number(record.timestamp) * 1000).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                          {record.royaltyReceiver.slice(0, 6)}...{record.royaltyReceiver.slice(-4)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">{convertWeiToEth(record.royaltyAmount)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="mt-8 flex flex-wrap justify-between items-center text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
              2507.38
            </span>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
            >
              Faucet
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-colors"
            >
              Block Explorer
            </motion.button>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9, rotate: -15 }}
            className="p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
          >
            🌙
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default NFTMarketTrading;

