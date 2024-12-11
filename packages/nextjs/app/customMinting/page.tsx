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
import { Upload, Sparkles, Grid3X3 } from 'lucide-react';

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

    const notificationId = notification.loading("Uploading to IPFS");
    try {
      let uploadedItems: string[];
      if (isFragmented) {
        uploadedItems = await Promise.all(fragmentedImages.map(async (fragment, index) => {
          const nftMetadata = {
            description: `${description} - Fragment ${index + 1}`,
            external_url: externalUrl,
            image: fragment,
            name: `${name} - Fragment ${index + 1}`,
            attributes: [
              {
                trait_type: "BackgroundColor",
                value: backgroundColor,
              },
              {
                trait_type: "Eyes",
                value: eyes,
              },
              {
                trait_type: "Stamina",
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
              trait_type: "BackgroundColor",
              value: backgroundColor,
            },
            {
              trait_type: "Eyes",
              value: eyes,
            },
            {
              trait_type: "Stamina",
              value: stamina,
            },
          ],
        };
        const uploadedItem = await addToIPFS(nftMetadata);
        uploadedItems = [uploadedItem.IpfsHash];
      }

      notification.remove(notificationId);
      notification.success("Metadata uploaded to IPFS");

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

    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-1000 p-6">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Mint Your NFT</h1>
          
          <div className="space-y-6">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-300 ease-in-out">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 800x400px)</p>
                </div>
                <input id="dropzone-file" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
              </label>
            </div>
            
            {imageFile && (
              <div className="mt-4">
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-auto rounded-lg shadow-md" />
              </div>
            )}

            {isFragmented && fragmentedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {fragmentedImages.map((fragment, index) => (
                  <img key={index} src={fragment} alt={`Fragment ${index + 1}`} className="w-full h-auto rounded-lg shadow-md" />
                ))}
              </div>
            )}
            
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-300 ease-in-out"
            />

            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-300 ease-in-out"
              rows={3}
            />

            <input
              type="text"
              placeholder="Background Color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-300 ease-in-out"
            />

            <input
              type="text"
              placeholder="Eyes"
              value={eyes}
              onChange={(e) => setEyes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-300 ease-in-out"
            />

            <input
              type="number"
              placeholder="Stamina"
              value={stamina}
              onChange={(e) => setStamina(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-300 ease-in-out"
            />

            <input
              type="number"
              placeholder="Royalty Percentage (default 5%)"
              value={royaltyPercentage}
              onChange={(e) => setRoyaltyPercentage(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-300 focus:outline-none transition-all duration-300 ease-in-out"
            />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Fragmented NFT</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={isFragmented} onChange={() => setIsFragmented(!isFragmented)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          <div className="mt-8">
            {!isConnected || isConnecting ? (
              <RainbowKitCustomConnectButton className="w-full px-6 py-3 text-white font-semibold rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all duration-300 ease-in-out shadow-lg" />
            ) : (
              <button 
                onClick={handleMintItem} 
                className="w-full px-6 py-3 text-white font-semibold rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all duration-300 ease-in-out shadow-lg flex items-center justify-center"
              >
                {isFragmented ? <Grid3X3 className="w-5 h-5 mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                {isFragmented ? 'Mint Fragmented NFT' : 'Mint NFT'}
              </button>
            )}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default CustomMinting;

