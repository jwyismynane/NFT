"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import Image from "next/image";

// 将 Wei 转换为 ETH
const convertWeiToEth = (wei: bigint): string => {
  // 使用 BigInt 处理大数，直接通过字符串运算避免精度问题
  const ethValue = wei / BigInt(1e18); // 整数部分
  const fractionalValue = wei % BigInt(10 ** 18); // 小数部分
  
  // 构造完整的 ETH 值，保留最多 18 位小数
  const result = `${ethValue}.${fractionalValue.toString().padStart(0, '0')}`;
  
  // 返回去掉多余尾随零的小数格式
  return parseFloat(result).toString();
};

const AuctionPage: React.FC = () => {
    const [nftMetadata, setNftMetadata] = useState<any>(null);
    const [remainingTime, setRemainingTime] = useState<number>(0);
    const [isBlindAuction, setIsBlindAuction] = useState<boolean>(false);
    const [activeAuctions, setActiveAuctions] = useState<string[]>([]);
    const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
    const [bidAmount, setBidAmount] = useState<string>("");
    const [bidRecords, setBidRecords] = useState<any[]>([]);

    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenId = searchParams.get("tokenId");

    const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

    // 获取所有活跃的拍卖 NFT ID
    const { data: activeAuctionIds } = useScaffoldReadContract({
        contractName: "YourCollectible",
        functionName: "getActiveAuctionIds",
        watch: true,
    });

    useEffect(() => {
        if (activeAuctionIds) {
            setActiveAuctions(activeAuctionIds.map((id: BigInt) => id.toString()));
        }
    }, [activeAuctionIds]);

    // 获取选择的拍卖 NFT 信息
    const { data: auctionInfo } = useScaffoldReadContract({
        contractName: "YourCollectible",
        functionName: "getAuctionInfo",
        args: [BigInt(selectedTokenId || "0")],
        watch: true,
        enabled:!!selectedTokenId,
    });

    // 获取 NFT 元数据（非盲拍时）
    useEffect(() => {
        if (auctionInfo) {
          console.log("67890-87657890-987",auctionInfo);
            const blindAuction = auctionInfo.tokenUri === "???";
            setIsBlindAuction(blindAuction);

            if (!blindAuction && auctionInfo?.tokenUri) {
                fetch(auctionInfo.tokenUri)
                  .then((response) => response.json())
                  .then((metadata) => setNftMetadata(metadata))
                  .catch((error) => console.error("Failed to fetch metadata:", error));
            }
        }
    }, [auctionInfo]);

    // 更新时间倒计时
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (auctionInfo?.endTime) {
                const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
                const remainingTime = Number(auctionInfo.endTime - currentTimestamp);
                setRemainingTime(remainingTime);
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [auctionInfo]);

    // 竞价功能，添加了出价验证逻辑
    const handlePlaceBid = async () => {
      const bidValue = BigInt(bidAmount) * BigInt(10) ** BigInt(18);
      const auctionInfoValue = auctionInfo;
      const startingPrice = BigInt(auctionInfoValue?.startingPrice || 0);
      const minBidIncrement = BigInt(auctionInfoValue?.minBidIncrement || 0);
      const highestBid = BigInt(auctionInfoValue?.highestBid || 0);
  
      // 验证出价是否低于起拍价
      if (bidValue < startingPrice) {
          notification.error("出价不能低于起拍价");
          return;
      }
      // 验证出价是否低于当前最高出价加上最低加价
      if (bidValue < highestBid + minBidIncrement) {
          notification.error("出价必须高于当前最高出价加上最低加价");
          return;
      }
  
      const notificationId = notification.loading("Processing bid...");
      try {
          // 调用 placeBid 方法，确保参数类型符合合约要求
          await writeContractAsync({
              functionName: "placeBid",
              args: [Number(selectedTokenId)],
              value: bidValue,
          });
  
          notification.remove(notificationId);
          notification.success("Bid placed successfully");
      } catch (error) {
          notification.remove(notificationId);
          if (error instanceof Error) {
              console.error(error.message);
              notification.error(`出价失败: ${error.message}`);
          } else {
              console.error("未知错误", error);
              notification.error("出价失败，未知原因");
          }
      }
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

    // 选择一个拍卖
    const handleAuctionSelect = (id: string) => {
        setSelectedTokenId(id);
        router.push(`/auction?tokenId=${id}`);
    };

    // 获取所选NFT的竞价记录
    const { data: bidRecordsData } = useScaffoldReadContract({
        contractName: "YourCollectible",
        functionName: "getBidRecordsByTokenId",
        args: [BigInt(selectedTokenId || "0")],
        watch: true,
        enabled:!!selectedTokenId,
    });

    useEffect(() => {
        if (bidRecordsData) {
            setBidRecords(bidRecordsData);
        }
    }, [bidRecordsData]);

    return (
        <div className="min-h-screen bg-teal-600 p-6">
            <div className="container mx-auto max-w-6xl">
                {/* 活跃拍卖列表 */}
                {!selectedTokenId? (
                    <div className="bg-white rounded-lg p-6 mb-8">
                        <h2 className="text-2xl font-bold text-green-800 mb-4">
                            Active Auctions
                        </h2>
                        <div className="space-y-4 text-green-800">
                            {activeAuctions.length === 0? (
                                <p className="text-blue-600">No active auctions</p>
                            ) : (
                                activeAuctions.map((auctionId) => (
                                    <div
                                        key={auctionId}
                                        className="flex justify-between items-center p-4 bg-green-100 rounded-lg hover:bg-green-200 transition-colors cursor-pointer"
                                        onClick={() => handleAuctionSelect(auctionId)}
                                    >
                                        <span className="text-lg font-semibold">
                                            Auction ID: {auctionId}
                                        </span>
                                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                                            View Auction
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    // NFT Details Section
                    <div className="bg-white rounded-lg p-6 mb-8">
                        <div className="flex gap-8">
                            <div className="w-64 h-64 relative">
                                {isBlindAuction? (
                                    <Image
                                        src="/gift-placeholder.jpg"
                                        alt="Hidden Gift"
                                        layout="fill"
                                        objectFit="cover"
                                        className="rounded-lg"
                                    />
                                ) : nftMetadata?.image? (
                                    <Image
                                        src={nftMetadata.image}
                                        alt={nftMetadata.name || `NFT #${selectedTokenId}`}
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
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                                    Auction Details
                                </h2>
                                <div className="space-y-2">
                                    <p className="text-gray-600">
                                        Token ID: {selectedTokenId}
                                    </p>
                                    <p className="text-gray-600">
                                        Starting Price: {auctionInfo?.startingPrice
                                           ? parseInt(auctionInfo?.startingPrice.toString()) 
                                            : "N/A"} ETH
                                    </p>
                                    <p className="text-gray-600">
                                        Highest Bid: {auctionInfo?.highestBid
                                           ? parseInt(auctionInfo?.highestBid.toString())
                                            : "暂无最高出价"} ETH
                                    </p>
                                    <p className="text-gray-600">
                                        Minimum Bid Increment: {auctionInfo?.minBidIncrement
                                           ? parseInt((auctionInfo?.minBidIncrement.toString()))
                                            : "N/A"} ETH
                                    </p>
                                    <p className="text-gray-600">Seller: {auctionInfo?.seller}</p>
                                    <p className="text-red-600">
                                        剩余时间: {formatTime(remainingTime)}
                                    </p>

                                    <div className="mt-4">
                                        <input
                                            type="text"
                                            value={bidAmount}
                                            onChange={(e) => setBidAmount(e.target.value)}
                                            placeholder="Enter your bid (ETH)"
                                            className="border border-gray-300 rounded-lg px-4 py-2 w-full"
                                        />
                                        <button
                                            onClick={handlePlaceBid}
                                            className="mt-4 bg-blue-600 text-white rounded-lg px-4 py-2 w-full"
                                        >
                                            Place Bid
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* 竞价历史记录 */}
                        {selectedTokenId && (
                            <div className="bg-white rounded-lg p-6 mb-8">
                                <h2 className="text-2xl font-bold text-green-800 mb-4">
                                    Bidding History
                                </h2>
                                <table className="min-w-full divide-y divide-green-200">
                                    <thead className="bg-green-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
                                                Bidder
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
                                                Bid Amount (ETH)
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-green-500 uppercase tracking-wider">
                                                Bid Time
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-green divide-y divide-green-200">
                                        {bidRecords.map((record, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-red-500 ">
                                                    {record.bidder}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-red-500">
                                                    {convertWeiToEth(record.bidAmount)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-red-500">
                                                    {new Date(Number(record.bidTime) * 1000).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuctionPage;