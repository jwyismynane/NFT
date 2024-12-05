import React, { useEffect, useState } from 'react';

// 更明确地定义LeaderboardItem类型，避免使用any
interface LeaderboardItem {
    tokenId: string;
    name: string;
    clicks: number;
    image: string;
}

interface LeaderboardProps {
    clickCounts: Record<string, number>;
    nftMetadata: Record<string, { name: string; image: string }>;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ clickCounts, nftMetadata }) => {
    // 用于存储合并后的数据，同时从localStorage中读取之前保存的数据（如果有的话）
    const [combinedData, setCombinedData] = useState<LeaderboardItem[]>(() => {
        const storedData = localStorage.getItem('leaderboardData');
        return storedData? JSON.parse(storedData) : [];
    });

    useEffect(() => {
        // 先将点击次数相关的数据和对应的NFT元数据进行合并处理
        const newCombinedData: LeaderboardItem[] = Object.entries(clickCounts).map(([tokenId, clicks]) => {
            const metadata = nftMetadata[tokenId] || { name: `NFT #${tokenId}`, image: "/gift-placeholder.jpg" };
            return {
                tokenId,
                name: metadata.name,
                clicks,
                image: metadata.image
            };
        });

        // 按照点击次数进行降序排序，如果点击次数相同，可考虑按照tokenId等其他规则进一步排序，这里先简单以点击次数为主
        newCombinedData.sort((a, b) => {
            if (b.clicks === a.clicks) {
                return a.tokenId.localeCompare(b.tokenId);
            }
            return b.clicks - a.clicks;
        });

        setCombinedData(newCombinedData);

        // 将更新后的数据存储到localStorage中
        localStorage.setItem('leaderboardData', JSON.stringify(newCombinedData));
    }, [clickCounts, nftMetadata]);

    // 获取前5的数据，如果总数不足5个，就取全部的数据
    const leaderboard: LeaderboardItem[] = combinedData.slice(0, Math.min(combinedData.length, 5));

    return (
        <div className="bg-red-500 rounded-lg shadow-md p-6 mt-8">
            <h2 className="text-2xl font-bold text-center mb-4">Top 5 Most Viewed NFTs</h2>
            <ul className="space-y-4">
                {leaderboard.map((item, index) => (
                    <li key={item.tokenId} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                        <div className="flex items-center space-x-4">
                            <img src={item.image} alt={item.name} className="w-12 h-12 rounded-full object-cover" />
                            <div>
                                <span className="font-medium">{item.name}</span>
                                <p className="text-sm text-gray-500">Token ID: {item.tokenId}</p>
                            </div>
                        </div>
                        <span className="text-sm font-semibold">{item.clicks} views</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};