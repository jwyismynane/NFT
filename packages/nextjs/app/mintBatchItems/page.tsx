"use client";

import React, { useState, useRef } from "react";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { PlusCircle, Upload, Sparkles, Info } from 'lucide-react';
import { Batch_mint_NFT } from "../../utils/dbbutil";
import { usePublicClient } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";

interface NFTAttribute {
  file: File | null;
  preview: string;
  name: string;
  description: string;
  royaltyFraction: string;
}

const NFTMinter: React.FC = () => {
  const [nftAttributes, setNftAttributes] = useState<NFTAttribute[]>([]);
  const [currentNFT, setCurrentNFT] = useState<NFTAttribute>({
    file: null,
    preview: "",
    name: "",
    description: "",
    royaltyFraction: "5",
  });
  const { address: connectedAddress } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const publicClient = usePublicClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setCurrentNFT({ ...currentNFT, file, preview });
  };

  const handleAttributeChange = (field: keyof NFTAttribute, value: string) => {
    setCurrentNFT({ ...currentNFT, [field]: value });
  };

  const handleSaveCurrentNFT = () => {
    if (!currentNFT.file || !currentNFT.name || !currentNFT.description) {
      showNotification("error", "请填写所有字段并选择一张图片哦～");
      return;
    }

    setNftAttributes([...nftAttributes, currentNFT]);
    setCurrentNFT({ file: null, preview: "", name: "", description: "", royaltyFraction: "5" });
    showNotification("success", "NFT 保存成功！你可以继续添加更多哦～");
  };

  const handleSubmitBatchMint = async () => {
    if (nftAttributes.length === 0 || !connectedAddress) {
      showNotification("error", "没有可铸造的 NFT 或钱包未连接，再检查一下吧～");
      return;
    }

    const notificationId = showNotification("loading", "正在批量上传到 IPFS，请稍等...");
    try {
      const metadataURIs: string[] = [];
      const royaltyValue = parseInt(nftAttributes[0].royaltyFraction) * 100;

      for (const nft of nftAttributes) {
        const metadata = {
          name: nft.name,
          description: nft.description,
          image: await uploadFileToIPFS(nft.file!),
        };

        const uploadedMetadata = await addToIPFS(metadata);
        metadataURIs.push(uploadedMetadata.IpfsHash);
      }

      if (royaltyValue > 1000) {
        showNotification("error", "版税不能超过 10% 哦，调整一下吧～");
        return;
      }

      await writeContractAsync({
        functionName: "mintBatch",
        args: [connectedAddress, metadataURIs, royaltyValue],
      });
     
      for (const nft of nftAttributes) {
        const metadata = {
          name: nft.name,
          description: nft.description,
          image: await uploadFileToIPFS(nft.file!),
          royaltyValue: royaltyValue,
        };
        await Batch_mint_NFT(metadata);
      }
  
      notification.remove(notificationId);
      showNotification("success", "批量铸造成功啦！你的 NFT 已经诞生了～");
      setNftAttributes([]);
    } catch (error) {
      console.error("Batch minting failed", error);
      showNotification("error", "批量铸造失败了，再试一次吧～");
      notification.remove(notificationId);
    }
  };

  const uploadFileToIPFS = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        "pinata_api_key": process.env.NEXT_PUBLIC_PINATA_API_KEY!,
        "pinata_secret_api_key": process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY!,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("文件上传失败了，再试一次吧～");
    }

    const data = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  };

  const showNotification = (type: "success" | "error" | "loading", message: string) => {
    const notificationStyle = {
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      padding: '16px 20px',
      fontSize: '16px',
      fontWeight: 'bold',
    };

    
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-100 to-blue-200 p-6">
      <div className="container mx-auto">
        <h1 className="text-5xl font-bold mb-12 text-center text-teal-800 tracking-wide">
          NFT 批量铸造工坊
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div 
            className="bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg rounded-2xl p-8 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-semibold mb-6 text-teal-700">当前 NFT 配置</h2>
            <div className="space-y-6">
              <motion.div 
                className="flex items-center justify-center w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-teal-300 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-300 ease-in-out group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-12 h-12 mb-4 text-teal-500 group-hover:text-teal-600 transition-colors duration-300" />
                    <p className="mb-2 text-sm text-gray-500 group-hover:text-gray-600">
                      <span className="font-semibold">点击上传</span> 或拖放文件
                    </p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-600">
                      支持 PNG、JPG 或 GIF（建议尺寸：800x800px）
                    </p>
                  </div>
                  <input 
                    ref={fileInputRef}
                    id="dropzone-file" 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange} 
                    accept="image/*" 
                  />
                </label>
              </motion.div>
              <AnimatePresence>
                {currentNFT.preview && (
                  <motion.img 
                    src={currentNFT.preview} 
                    alt="预览" 
                    className="mt-4 rounded-lg shadow-lg max-w-full h-auto"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </AnimatePresence>
              <motion.input
                type="text"
                placeholder="给你的 NFT 起个超酷的名字呀～"
                value={currentNFT.name}
                onChange={(e) => handleAttributeChange("name", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-teal-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all duration-300 ease-in-out text-gray-700"
                whileFocus={{ scale: 1.02 }}
              />
              <motion.textarea
                placeholder="讲讲 NFT 的独特之处吧～"
                value={currentNFT.description}
                onChange={(e) => handleAttributeChange("description", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-teal-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all duration-300 ease-in-out text-gray-700"
                rows={3}
                whileFocus={{ scale: 1.02 }}
              />
              <motion.input
                type="number"
                placeholder="输入版税百分比（默认 5%，最多 10% 哦～）"
                value={currentNFT.royaltyFraction}
                onChange={(e) => handleAttributeChange("royaltyFraction", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-teal-300 focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none transition-all duration-300 ease-in-out text-gray-700"
                whileFocus={{ scale: 1.02 }}
              />
              <motion.button
                onClick={handleSaveCurrentNFT}
                className="w-full px-6 py-3 text-white font-semibold bg-gradient-to-r from-teal-400 to-blue-500 rounded-lg shadow-md hover:from-teal-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75 transition-all duration-300 ease-in-out"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PlusCircle className="inline-block mr-2 h-5 w-5" />
                保存当前 NFT
              </motion.button>
            </div>
          </motion.div>

          <motion.div 
            className="bg-white bg-opacity-80 backdrop-filter backdrop-blur-lg rounded-2xl p-8 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-3xl font-semibold mb-6 text-teal-700">已保存的 NFT</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[600px] overflow-y-auto pr-4">
              <AnimatePresence>
                {nftAttributes.map((nft, index) => (
                  <motion.div 
                    key={index} 
                    className="bg-teal-50 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow duration-300"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <img src={nft.preview} alt={`已保存预览 ${index + 1}`} className="w-full h-48 object-cover rounded-lg mb-4" />
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-semibold text-teal-700">名称：</span> {nft.name}</p>
                      <p><span className="font-semibold text-teal-700">描述：</span> {nft.description}</p>
                      <p><span className="font-semibold text-teal-700">版税：</span> {nft.royaltyFraction}%</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1,opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.button
            onClick={handleSubmitBatchMint}
            className="w-full px-6 py-4 text-white font-semibold bg-gradient-to-r from-blue-500 to-teal-400 rounded-xl shadow-lg hover:from-blue-600 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all duration-300 ease-in-out text-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="inline-block mr-2 h-6 w-6" />
            批量铸造 NFT
          </motion.button>
        </motion.div>

        <motion.div 
          className="mt-8 text-center text-sm text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Info className="inline-block w-5 h-5 mr-1 text-teal-600" />
          铸造 NFT 需要支付少量 gas 费用，请确保你的钱包中有足够的 ETH。
        </motion.div>
      </div>
    </div>
  );
};

export default NFTMinter;

