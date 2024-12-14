"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, DollarSign, User, ArrowLeft } from 'lucide-react';

// 将 Wei 转换为 ETH
const convertWeiToEth = (wei: bigint): string => {
    const ethValue = wei / BigInt(1e18);
    return ethValue.toString();
};

const AuctionPageClient: React.FC = () => {
    const [nftMetadata, setNftMetadata] = useState<any>(null);
    const [remainingTime, setRemainingTime] = useState<number>(0);
    const [isBlindAuction, setIsBlindAuction] = useState<boolean>(false);
    const [activeAuctions, setActiveAuctions] = useState<string[]>([]);
    const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
    const [bidAmount, setBidAmount] = useState<string>("");
    const [bidRecords, setBidRecords] = useState<any[]>([]);
    const [auctionEnded, setAuctionEnded] = useState<boolean>(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenId = searchParams.get("tokenId");

    const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

    // 获取活跃拍卖ID列表
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

    // 获取拍卖信息
    const { data: auctionInfo } = useScaffoldReadContract({
        contractName: "YourCollectible",
        functionName: "getAuctionInfo",
        args: [BigInt(selectedTokenId || "0")],
        watch: true,
        enabled: !!selectedTokenId,
    });

    useEffect(() => {
        if (auctionInfo) {
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

    // 更新剩余时间
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (auctionInfo?.endTime) {
                const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
                const remainingTime = Number(auctionInfo.endTime - currentTimestamp);
                setRemainingTime(remainingTime);
                if (remainingTime <= 0) {
                    setAuctionEnded(true);
                }
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [auctionInfo]);

    // 处理出价
    const handlePlaceBid = async () => {
        const bidValue = BigInt(parseFloat(bidAmount) * 1e18);
        const auctionInfoValue = auctionInfo;
        const startingPrice = BigInt(auctionInfoValue?.startingPrice || 0);
        const minBidIncrement = BigInt(auctionInfoValue?.minBidIncrement || 0);
        const highestBid = BigInt(auctionInfoValue?.highestBid || 0);

        if (bidValue < startingPrice) {
            notification.error("出价不能低于起拍价");
            return;
        }
        if (bidValue < highestBid + minBidIncrement) {
            notification.error("出价必须高于当前最高出价加上最低加价");
            return;
        }

        const notificationId = notification.loading("正在处理出价...");
        try {
            await writeContractAsync({
                functionName: "placeBid",
                args: [BigInt(selectedTokenId || "0")],
                value: bidValue,
            });
            notification.remove(notificationId);
            notification.success("出价成功");
        } catch (error) {
            notification.remove(notificationId);
            console.error("出价失败", error);
            notification.error("出价失败，请检查您的钱包余额和网络连接");
        }
    };

    // 结束拍卖
    const handleEndAuction = async () => {
        const notificationId = notification.loading("正在结束拍卖...");
        try {
            await writeContractAsync({
                functionName: "autoEndAuction",
                args: [BigInt(selectedTokenId || "0")],
            });
            notification.remove(notificationId);
            notification.success("拍卖已成功结束");
            setAuctionEnded(true);
        } catch (error) {
            notification.remove(notificationId);
            console.error("结束拍卖失败", error);
            notification.error("结束拍卖失败，请稍后再试");
        }
    };

    // 格式化时间
    const formatTime = (seconds: number) => {
        const days = Math.floor(seconds / (24 * 60 * 60));
        const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((seconds % (60 * 60)) / 60);
        const secs = seconds % 60;

        return `${days}天 ${hours}时 ${minutes}分 ${secs}秒`;
    };

    // 选择拍卖
    const handleAuctionSelect = (id: string) => {
        setSelectedTokenId(id);
        router.push(`/auction?tokenId=${id}`);
    };

    // 获取竞价记录
    const { data: bidRecordsData } = useScaffoldReadContract({
        contractName: "YourCollectible",
        functionName: "getBidRecordsByTokenId",
        args: [BigInt(selectedTokenId || "0")],
        watch: true,
        enabled: !!selectedTokenId,
    });

    useEffect(() => {
        if (bidRecordsData) {
            setBidRecords(bidRecordsData);
        }
    }, [bidRecordsData]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 p-6">
            <div className="container mx-auto max-w-4xl">
                {!selectedTokenId ? (
                    // 活跃拍卖列表
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-xl shadow-lg p-6 mb-8"
                    >
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">活跃拍卖</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeAuctions.length === 0 ? (
                                <p className="text-gray-600 col-span-full">当前没有活跃的拍卖</p>
                            ) : (
                                activeAuctions.map((auctionId) => (
                                    <motion.div
                                        key={auctionId}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="bg-gradient-to-r from-purple-400 to-indigo-500 rounded-lg p-4 shadow-md cursor-pointer transition-all duration-300"
                                        onClick={() => handleAuctionSelect(auctionId)}
                                    >
                                        <h3 className="text-xl font-semibold text-white mb-2">拍卖 #{auctionId}</h3>
                                        <p className="text-purple-100">点击查看详情</p>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                ) : (
                    // 拍卖详情
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-xl shadow-lg p-6 mb-8"
                    >
                        <button
                            onClick={() => setSelectedTokenId(null)}
                            className="mb-4 flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-300"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            返回拍卖列表
                        </button>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="w-full md:w-1/2">
                                <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-md">
                                    {isBlindAuction ? (
                                        <Image
                                            src="/gift-placeholder.jpg"
                                            alt="神秘拍品"
                                            layout="fill"
                                            objectFit="cover"
                                        />
                                    ) : nftMetadata?.image ? (
                                        <Image
                                            src={nftMetadata.image}
                                            alt={nftMetadata.name || `NFT #${selectedTokenId}`}
                                            layout="fill"
                                            objectFit="cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                            <p className="text-gray-400">加载中...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                                    {isBlindAuction ? "神秘拍卖" : nftMetadata?.name || `NFT #${selectedTokenId}`}
                                </h2>
                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center space-x-2">
                                        <User className="w-5 h-5 text-gray-500" />
                                        <span className="text-gray-600">卖家:</span>
                                        <span className="font-semibold text-gray-800">{auctionInfo?.seller}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <DollarSign className="w-5 h-5 text-gray-500" />
                                        <span className="text-gray-600">当前最高出价:</span>
                                        <span className="font-semibold text-gray-800">
                                            {auctionInfo?.highestBid
                                                ? `${convertWeiToEth(auctionInfo.highestBid)} ETH`
                                                : "暂无出价"}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Clock className="w-5 h-5 text-gray-500" />
                                        <span className="text-gray-600">剩余时间:</span>
                                        <span className="font-semibold text-gray-800">
                                            {remainingTime > 0 ? formatTime(remainingTime) : "拍卖已结束"}
                                        </span>
                                    </div>
                                </div>
                                {remainingTime > 0 ? (
                                    <div className="space-y-4">
                                        <input
                                            type="number"
                                            value={bidAmount}
                                            onChange={(e) => setBidAmount(e.target.value)}
                                            placeholder="输入您的出价 (ETH)"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handlePlaceBid}
                                            className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 font-semibold transition-colors duration-300 hover:bg-indigo-700"
                                        >
                                            出价
                                        </motion.button>
                                    </div>
                                ) : auctionEnded ? (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleEndAuction}
                                        className="w-full bg-red-600 text-white rounded-lg px-4 py-2 font-semibold transition-colors duration-300 hover:bg-red-700"
                                    >
                                        结束拍卖
                                    </motion.button>
                                ) : (
                                    <p className="text-center text-gray-600 font-semibold">拍卖已结束</p>
                                )}
                            </div>
                        </div>
                        {/* 竞价历史记录 */}
                        <div className="mt-8">
                            <h3 className="text-2xl font-bold text-gray-800 mb-4">竞价历史</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">竞拍者</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出价 (ETH)</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {bidRecords.map((record, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.bidder}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{convertWeiToEth(record.bidAmount)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(Number(record.bidTime) * 1000).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default AuctionPageClient;

