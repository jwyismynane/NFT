"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// 假设你会从 props 或者其他地方传递相关的数据
const NFTClaimPage = ({ merkleRoot, leaves, proofs, startTokenId }: any) => {
  const [tokenId, setTokenId] = useState("");
  const [proof, setProof] = useState("");
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  // 固定的 owner 地址
  const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const claimNFT = async () => {
    setError(null);
    setClaimStatus(null);

    if (!tokenId || !proof) {
      setError("请填写所有字段");
      return;
    }

    try {
      await writeContractAsync({
        functionName: "claimNFT",
        args: [proof.split(","), parseInt(tokenId, 10), ownerAddress],
      });

      setClaimStatus("恭喜！你已成功领取NFT");
    } catch (err) {
      setError("领取过程中出现错误");
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-3xl font-bold text-center text-black mb-2">NFT领取</h1>
        <p className="text-center text-gray-800 mb-6">输入你的信息来领取你的NFT</p>

        {/* 显示 Merkle Tree 的结果 */}
        {merkleRoot && (
          <div className="p-4 bg-gray-600 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-2">Merkle Root</h3>
            <p className="font-mono break-all">{merkleRoot}</p>
          </div>
        )}

        {leaves && proofs && (
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-black mb-2">Token ID 和 Merkle Proof</h3>
            <div className="space-y-2">
              {leaves.map((leaf: string, index: number) => {
                const tokenIdValue = startTokenId + index;
                const key = `${leaves[index]}`;
                return (
                  <div key={index} className="bg-gray-100 p-4 rounded-md">
                    <p className="font-mono text-sm text-gray-700">Token ID: {tokenIdValue}</p>
                    <p className="font-mono text-sm text-gray-700">哈希值: {leaf}</p>
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-gray-800">查看 Proof</summary>
                      <ul className="list-disc list-inside mt-2">
                        {proofs[key]?.map((p: string, i: number) => (
                          <li key={i} className="font-mono text-xs text-gray-600">{p}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 用户输入信息并领取 NFT */}
        <div className="space-y-4">
          <div>
            <label htmlFor="tokenId" className="block text-sm font-medium text-gray-800 mb-1">
              Token ID
            </label>
            <input
              id="tokenId"
              type="text"
              placeholder="输入你的Token ID"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label htmlFor="proof" className="block text-sm font-medium text-gray-800 mb-1">
              Merkle Proof
            </label>
            <input
              id="proof"
              type="text"
              placeholder="输入你的Merkle Proof(用逗号分隔)"
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-800 mb-1">
              Owner 地址
            </label>
            <input
              id="owner"
              type="text"
              value={ownerAddress}
              readOnly
              className="w-full p-2 border rounded-md bg-gray-800"
            />
          </div>
          <div className="flex justify-center">
            <button
              onClick={claimNFT}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              领取NFT
            </button>
          </div>
        </div>

        {claimStatus && (
          <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            <p>{claimStatus}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <h3 className="font-bold">错误</h3>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTClaimPage;

