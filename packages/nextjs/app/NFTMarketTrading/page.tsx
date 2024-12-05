"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import Image from "next/image";

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
      // 检测是否为盲拍模式
      const blindAuction = nftItem.tokenUri === "???";
      setIsBlindAuction(blindAuction);

      // 非盲拍时请求元数据
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

//单位转换
  const convertWeiToEth = (wei: bigint): string => {
    return (Number(wei) / 10**18).toFixed(2);
  };

  // 时间戳转化
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
    <div className="min-h-screen bg-teal-600 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* NFT Details Section */}
        <div className="bg-white rounded-lg p-6 mb-8">
          <div className="flex gap-8">
            <div className="w-64 h-64 relative">
              {isBlindAuction ? (
                <Image
                  src="/gift-placeholder.jpg" // 替换为你的礼物图片 URL
                  alt="Hidden Gift"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              ) : nftMetadata?.image ? (
                <Image
                  src={nftMetadata.image}
                  alt={nftMetadata.name || `NFT #${tokenId}`}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">Loading...</p>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">NFT Details</h2>
              <div className="space-y-2">
                <p className="text-gray-600">Token ID: {tokenId}</p>
                <p className="text-gray-600">Price: {nftItem?.price.toString()} ETH</p>
                {isBlindAuction ? (
                  <p className="text-red-500">盲拍：信息隐藏</p>
                ) : (
                  <>
                    <p className="text-gray-600">Name: {nftMetadata?.name}</p>
                    <p className="text-gray-600">Seller: {nftItem?.seller}</p>
                  </>
                )}
                {nftItem?.isListed && (
                  <div>
                    <p className="text-red-600">剩余时间: {formatTime(remainingTime)}</p>
                    <button
                      onClick={() => handleBuyItem(nftItem?.tokenId, nftItem?.price)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Purchase NFT
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

         {/* Trading History Section */}
         <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">NFT Trading History</h1>
          
          {isPurchaseRecordsLoading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-white border-b border-white/20">
                    <th className="px-6 py-3 text-left">Token ID</th>
                    <th className="px-6 py-3 text-left">Buyer</th>
                    <th className="px-6 py-3 text-left">Seller</th>
                    <th className="px-6 py-3 text-right">Price (ETH)</th>
                    <th className="px-6 py-3 text-left">Time</th>
                    <th className="px-6 py-3 text-left">Royalty Receiver</th>
                    <th className="px-6 py-3 text-left">Royalty amount (ETH)</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRecords?.map((record, index) => (
                    <tr 
                      key={index} 
                      className="text-white/90 border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">{tokenId}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          {record.buyer.slice(0, 6)}...{record.buyer.slice(-4)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          {record.seller.slice(0, 6)}...{record.seller.slice(-4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">{record.price.toString()}</td>
                      <td className="px-6 py-4">
                        {new Date(Number(record.timestamp) * 1000).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {record.royaltyReceiver.slice(0, 6)}...{record.royaltyReceiver.slice(-4)}
                      </td>
                      <td className="px-6 py-4 text-right">{convertWeiToEth(record.royaltyAmount).toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-between items-center text-white/80">
          <div className="flex items-center gap-4">
            <span>2507.38</span>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
              Faucet
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
              Block Explorer
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              🌙
            </button>
          </div>
          </div>

     
      </div>
    </div>
  );
};

export default NFTMarketTrading;
