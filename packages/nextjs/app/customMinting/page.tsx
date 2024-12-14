"use client";

import { MyHoldings } from "./_components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { useState, useRef, useEffect } from "react";
import { mint_nft, place_nft } from "../../utils/dbbutil";
import { usePublicClient } from "wagmi";
import { Upload, Sparkles, Grid3X3, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomMinting: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  const { data: tokenIdCounter } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "tokenIdCounter",
    watch: true,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fragmentedImages, setFragmentedImages] = useState<string[]>([]);
  const [backgroundColor, setBackgroundColor] = useState("");
  const [eyes, setEyes] = useState("");
  const [stamina, setStamina] = useState(0);
  const [royaltyPercentage, setRoyaltyPercentage] = useState(5);
  const [isFragmented, setIsFragmented] = useState(false);
  const publicClient = usePublicClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  useEffect(() => {
    if (imageFile && isFragmented) {
      const img = new Image();
      img.onload = () => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, img.width, img.height);
            const fragments: string[] = [];
            const fragmentWidth = img.width / 3;
            const fragmentHeight = img.height / 3;
            for (let i = 0; i < 3; i++) {
              for (let j = 0; j < 3; j++) {
                const fragmentCanvas = document.createElement('canvas');
                fragmentCanvas.width = fragmentWidth;
                fragmentCanvas.height = fragmentHeight;
                const fragmentCtx = fragmentCanvas.getContext('2d');
                if (fragmentCtx) {
                  fragmentCtx.drawImage(
                    canvas,
                    j * fragmentWidth,
                    i * fragmentHeight,
                    fragmentWidth,
                    fragmentHeight,
                    0,
                    0,
                    fragmentWidth,
                    fragmentHeight
                  );
                  fragments.push(fragmentCanvas.toDataURL());
                }
              }
            }
            setFragmentedImages(fragments);
          }
        }
      };
      img.src = URL.createObjectURL(imageFile);
    }
  }, [imageFile, isFragmented]);

  const handleMintItem = async () => {
    if (tokenIdCounter === undefined || !imageFile) return;

    const externalUrl = "https://austingriffith.com/portfolio/paintings/";

    const notificationId = notification.loading("正在上传到IPFS，请稍等...");
    try {
      let uploadedItems: string[];
      if (isFragmented) {
        uploadedItems = await Promise.all(fragmentedImages.map(async (fragment, index) => {
          const nftMetadata = {
            description: `${description} - 碎片 ${index + 1}`,
            external_url: externalUrl,
            image: fragment,
            name: `${name} - 碎片 ${index + 1}`,
            attributes: [
              {
                trait_type: "背景颜色",
                value: backgroundColor,
              },
              {
                trait_type: "眼睛",
                value: eyes,
              },
              {
                trait_type: "耐力值",
                value: stamina,
              },
            ],
          };
          const uploadedItem = await addToIPFS(nftMetadata);
          return uploadedItem.IpfsHash;
        }));
      } else {
        const reader = new FileReader();
        const imageDataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
        const nftMetadata = {
          description,
          external_url: externalUrl,
          image: imageDataUrl,
          name,
          attributes: [
            {
              trait_type: "背景颜色",
              value: backgroundColor,
            },
            {
              trait_type: "眼睛",
              value: eyes,
            },
            {
              trait_type: "耐力值",
              value: stamina,
            },
          ],
        };
        const uploadedItem = await addToIPFS(nftMetadata);
        uploadedItems = [uploadedItem.IpfsHash];
      }

      notification.remove(notificationId);
      notification.success("元数据成功上传到IPFS！");

      const formattedRoyaltyPercentage = royaltyPercentage * 100;

      let mintTx;
      if (isFragmented) {
        mintTx = await writeContractAsync({
          functionName: "mintDebris",
          args: [connectedAddress, uploadedItems, formattedRoyaltyPercentage],
        });
      } else {
        mintTx = await writeContractAsync({
          functionName: "mintItem",
          args: [connectedAddress, uploadedItems[0], formattedRoyaltyPercentage],
        });
      }

      console.log("------mintTx=" + mintTx);
      const receipt = await publicClient?.getTransactionReceipt({ hash: mintTx as `0x${string}` });
      console.log("------receipt=" + receipt);
      console.log("-------receipt:", receipt);
      console.log("-------gasUsed:", receipt?.gasUsed);
      const gasUsed = receipt?.gasUsed.toString();

      const nft_id = receipt?.logs[0].topics[3];
      const numericId = parseInt(nft_id as `0x${string}`, 16);
      console.log("numericId=" + numericId);
      const mint_time = new Date().toLocaleString().slice(0, 19).replace(/ /g, '-');

      if (nft_id) {
        const metadata = {
          nft_id: numericId,
          name: name,
          description: description,
          image: externalUrl + uploadedItems[0],
          mint_time: mint_time,
          owner: connectedAddress,
          creator: connectedAddress,
          royaltyFeeNumerator: formattedRoyaltyPercentage,
          gasused: gasUsed,
        }
        await mint_nft(metadata);
      }

      notification.success("NFT铸造成功！🎉");

    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
      notification.error("铸造失败，请重试。");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-200 p-6 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl w-full mx-auto bg-white bg-opacity-90 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            创造您的专属NFT
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <motion.div 
                className="flex items-center justify-center w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-purple-300 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-300 ease-in-out group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 mb-3 from-purple-100 to-indigo-200 transition-colors duration-300" />
                    <p className="mb-2 text-sm text-gray-500 group-hover:text-gray-600"><span className="font-semibold">点击上传</span> 或拖放文件</p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-600">支持PNG、JPG或GIF格式（建议尺寸：800x800px）</p>
                  </div>
                  <input id="dropzone-file" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                </label>
              </motion.div>
              
              <AnimatePresence>
                {imageFile && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4"
                  >
                    <img src={URL.createObjectURL(imageFile)} alt="预览" className="w-full h-auto rounded-lg shadow-lg" />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isFragmented && fragmentedImages.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-3 gap-2 mt-4"
                  >
                    {fragmentedImages.map((fragment, index) => (
                      <motion.img 
                        key={index} 
                        src={fragment} 
                        alt={`碎片 ${index + 1}`} 
                        className="w-full h-auto rounded-lg shadow-md" 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-6">
              <motion.input
                type="text"
                placeholder="给你的NFT起个酷炫的名字吧！"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ease-in-out text-gray-700"
                whileFocus={{ scale: 1.02 }}
              />

              <motion.textarea
                placeholder="描述一下你的NFT有多与众不同~"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ease-in-out text-gray-700"
                rows={3}
                whileFocus={{ scale: 1.02 }}
              />

              <motion.input
                type="text"
                placeholder="背景颜色（比如：炫酷的深蓝色）"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ease-in-out text-gray-700"
                whileFocus={{ scale: 1.02 }}
              />

              <motion.input
                type="text"
                placeholder="眼睛特征（比如：闪亮的星星眼）"
                value={eyes}
                onChange={(e) => setEyes(e.target.value)}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ease-in-out text-gray-700"
                whileFocus={{ scale: 1.02 }}
              />

              <motion.input
                type="number"
                placeholder="耐力值（1-100）"
                value={stamina}
                onChange={(e) => setStamina(Number(e.target.value))}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ease-in-out text-gray-700"
                whileFocus={{ scale: 1.02 }}
              />

              <motion.input
                type="number"
                placeholder="版税比例（默认5%）"
                value={royaltyPercentage}
                onChange={(e) => setRoyaltyPercentage(Number(e.target.value))}
                className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-300 ease-in-out text-gray-700"
                whileFocus={{ scale: 1.02 }}
              />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">碎片化NFT</span>
                <motion.label 
                  className="relative inline-flex items-center cursor-pointer"
                  whileTap={{ scale: 0.95 }}
                >
                  <input type="checkbox" checked={isFragmented} onChange={() => setIsFragmented(!isFragmented)} className="sr-only peer" />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                </motion.label>
              </div>
            </div>
          </div>

          <div className="mt-8">
            {!isConnected || isConnecting ? (
              <RainbowKitCustomConnectButton className="w-full px-6 py-4 text-white font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all duration-300 ease-in-out shadow-lg text-lg" />
            ) : (
              <motion.button 
                onClick={handleMintItem} 
                className="w-full px-6 py-4 text-white font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all duration-300 ease-in-out shadow-lg text-lg flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isFragmented ? <Grid3X3 className="w-6 h-6 mr-2" /> : <Sparkles className="w-6 h-6 mr-2" />}
                {isFragmented ? '铸造碎片化NFT' : '铸造NFT'}
              </motion.button>
            )}
          </div>

          <motion.div 
            className="mt-6 text-center text-sm text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Info className="inline-block w-4 h-4 mr-1" />
            铸造NFT需要支付少量gas费用，请确保你的钱包中有足够的ETH。
          </motion.div>
        </div>
      </motion.div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default CustomMinting;

