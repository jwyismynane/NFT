"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { motion, AnimatePresence } from "framer-motion";

const NFTClaimPage = ({ merkleRoot, leaves, proofs, startTokenId }: any) => {
  const [tokenId, setTokenId] = useState("");
  const [proof, setProof] = useState("");
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const claimNFT = async () => {
    setError(null);
    setClaimStatus(null);

    if (!tokenId || !proof) {
      setError("哎呀，别忘了填写所有字段哦～");
      return;
    }

    try {
      await writeContractAsync({
        functionName: "claimNFT",
        args: [proof.split(","), parseInt(tokenId, 10), ownerAddress],
      });

      setClaimStatus("太棒了！你的 NFT 已经成功领取啦～");
    } catch (err) {
      setError("哎呀，领取过程中出了点小问题，再试一次吧～");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="p-8">
          <h1 className="text-4xl font-bold text-center text-blue-800 mb-2">NFT 领取中心</h1>
          <p className="text-center text-gray-600 mb-8">输入你的信息，领取专属 NFT</p>

          {merkleRoot && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mb-8 text-white shadow-md"
            >
              <h3 className="text-xl font-semibold mb-2">Merkle Root</h3>
              <p className="font-mono break-all text-sm">{merkleRoot}</p>
            </motion.div>
          )}

          {leaves && proofs && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6 mb-8"
            >
              <h3 className="text-2xl font-semibold text-blue-800 mb-4">Token ID 和 Merkle Proof</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {leaves.map((leaf: string, index: number) => {
                  const tokenIdValue = startTokenId + index;
                  const key = `${leaves[index]}`;
                  return (
                    <motion.div 
                      key={index} 
                      className="bg-blue-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
                      whileHover={{ scale: 1.02 }}
                    >
                      <p className="font-mono text-sm text-blue-700">Token ID: {tokenIdValue}</p>
                      <p className="font-mono text-sm text-blue-600 mt-1">哈希值: {leaf.slice(0, 10)}...</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-semibold text-blue-800 hover:text-blue-600 transition-colors duration-300">查看 Proof</summary>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {proofs[key]?.map((p: string, i: number) => (
                            <li key={i} className="font-mono text-xs text-gray-600">{p.slice(0, 15)}...</li>
                          ))}
                        </ul>
                      </details>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6"
          >
            <div>
              <label htmlFor="tokenId" className="block text-sm font-medium text-gray-700 mb-1">
                Token ID
              </label>
              <motion.input
                id="tokenId"
                type="text"
                placeholder="请输入你的 Token ID，比如 42～"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 ease-in-out"
                whileFocus={{ scale: 1.02 }}
              />
            </div>
            <div>
              <label htmlFor="proof" className="block text-sm font-medium text-gray-700 mb-1">
                Merkle Proof
              </label>
              <motion.input
                id="proof"
                type="text"
                placeholder="输入 Merkle Proof，记得用逗号分隔哦～"
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 ease-in-out"
                whileFocus={{ scale: 1.02 }}
              />
            </div>
            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-1">
                Owner 地址
              </label>
              <input
                id="owner"
                type="text"
                value={ownerAddress}
                readOnly
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
            <div className="flex justify-center mt-8">
              <motion.button
                onClick={claimNFT}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-lg font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all duration-300 ease-in-out"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                领取 NFT
              </motion.button>
            </div>
          </motion.div>

          <AnimatePresence>
            {claimStatus && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg"
              >
                <p className="font-semibold">{claimStatus}</p>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
              >
                <h3 className="font-bold mb-1">出错啦</h3>
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default NFTClaimPage;

