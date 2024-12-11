"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { PlusCircle, Upload } from 'lucide-react';
import { Batch_mint_NFT } from "../../utils/dbbutil";
import { usePublicClient } from "wagmi";

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
      notification.error("Please fill in all fields and select an image");
      return;
    }

    setNftAttributes([...nftAttributes, currentNFT]);
    setCurrentNFT({ file: null, preview: "", name: "", description: "", royaltyFraction: "5" });
    notification.success("NFT saved. You can add more.");
  };

  const handleSubmitBatchMint = async () => {
    if (nftAttributes.length === 0 || !connectedAddress) {
      notification.error("No NFTs to mint or wallet not connected");
      return;
    }

    const notificationId = notification.loading("Uploading to IPFS in batch...");
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
        notification.error("Royalty cannot exceed 10%");
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
          royaltyValue:royaltyValue,
        };
        await Batch_mint_NFT(metadata)
      }
  
      notification.remove(notificationId);
      notification.success("Batch minting successful!");
      setNftAttributes([]);
    } catch (error) {
      console.error("Batch minting failed", error);
      notification.error("Batch minting failed. Please try again.");
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
      throw new Error("File upload failed");
    }

    const data = await response.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Batch NFT Minter</h1>
      
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Current NFT Configuration</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 800x400px)</p>
              </div>
              <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
            </label>
          </div>
          {currentNFT.preview && (
            <img src={currentNFT.preview} alt="Preview" className="mt-4 rounded-lg shadow-md max-w-full h-auto" />
          )}
          <input
            type="text"
            placeholder="Name"
            value={currentNFT.name}
            onChange={(e) => handleAttributeChange("name", e.target.value)}
            className="w-full px-3 py-2 placeholder-gray-300 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-indigo-100 focus:border-indigo-300"
          />
          <textarea
            placeholder="Description"
            value={currentNFT.description}
            onChange={(e) => handleAttributeChange("description", e.target.value)}
            className="w-full px-3 py-2 placeholder-gray-300 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-indigo-100 focus:border-indigo-300"
            rows={3}
          />
          <input
            type="number"
            placeholder="Royalty percentage (default 5%)"
            value={currentNFT.royaltyFraction}
            onChange={(e) => handleAttributeChange("royaltyFraction", e.target.value)}
            className="w-full px-3 py-2 placeholder-gray-300 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-indigo-100 focus:border-indigo-300"
          />
          <button
            onClick={handleSaveCurrentNFT}
            className="w-full px-4 py-2 text-white font-semibold bg-indigo-500 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
          >
            Save Current NFT
          </button>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Saved NFTs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nftAttributes.map((nft, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4 shadow">
              <img src={nft.preview} alt={`Saved Preview ${index + 1}`} className="w-full h-48 object-cover rounded-lg mb-2" />
              <div className="text-sm text-gray-600">
                <p><span className="font-semibold">Name:</span> {nft.name}</p>
                <p><span className="font-semibold">Description:</span> {nft.description}</p>
                <p><span className="font-semibold">Royalty:</span> {nft.royaltyFraction}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmitBatchMint}
        className="w-full px-4 py-2 text-white font-semibold bg-green-500 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
      >
        Batch Mint NFTs
      </button>
    </div>
  );
};

export default NFTMinter;

