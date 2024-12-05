"use client";

import { MyHoldings } from "./_components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { useState } from "react";
import { mint_nft,place_nft } from "../../utils/dbbutil";
import { usePublicClient } from "wagmi";  //新增获取NFT tokenId

const MyNFTs: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  const { data: tokenIdCounter } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "tokenIdCounter",
    watch: true,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState("");
  const [eyes, setEyes] = useState("");
  const [stamina, setStamina] = useState(0);
  const [royaltyPercentage, setRoyaltyPercentage] = useState(5); // 默认5%
  // 定义与区块链交互信息的工具
  const publicClient = usePublicClient();

  const handleMintItem = async () => {
    if (tokenIdCounter === undefined || !imageFile) return;

    const externalUrl = "https://austingriffith.com/portfolio/paintings/";

    // Convert the image file to a URL
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onloadend = async () => {
      const nftMetadata = {
        description,
        external_url: externalUrl,
        image: reader.result,
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

      const notificationId = notification.loading("Uploading to IPFS");
      try {
        const uploadedItem = await addToIPFS(nftMetadata);
        notification.remove(notificationId);
        notification.success("Metadata uploaded to IPFS");

        // 将用户输入的百分比转换为合约所需的格式
        const formattedRoyaltyPercentage = royaltyPercentage * 100;

      

        const mintTx = await writeContractAsync({
          functionName: "mintItem",
          args: [connectedAddress, uploadedItem.IpfsHash, formattedRoyaltyPercentage],
        });

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
        //         if(nft_id) {
        //           const data = {
        //             nft_id: numericId,
        //             name: name,
        //             description: description,
        //             token_uri: uploadedItem.IpfsHash,
        //             mint_time: mint_time,
        //             owner: connectedAddress,
        //             creator: connectedAddress,
        //             state: 0,
        //             royaltyFeeNumerator: 500,
        //         };
        //         // await mint_nft(data);
        // }
        if(nft_id) {
        const metadata = {
          nft_id: numericId,
          name: name,
          description: description,
          image: externalUrl+uploadedItem.IpfsHash,
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
  };

  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">My NFTs</span>
          </h1>
          <div>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="input"
            />
            <input
              type="text"
              placeholder="Background Color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="input"
            />
            <input
              type="text"
              placeholder="Eyes"
              value={eyes}
              onChange={(e) => setEyes(e.target.value)}
              className="input"
            />
            <input
              type="number"
              placeholder="Stamina"
              value={stamina}
              onChange={(e) => setStamina(Number(e.target.value))}
              className="input"
            />
            <input
              type="number"
              placeholder="Royalty Percentage (default 5%)"
              value={royaltyPercentage}
              onChange={(e) => setRoyaltyPercentage(Number(e.target.value))}
              className="input"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        {!isConnected || isConnecting ? (
          <RainbowKitCustomConnectButton />
        ) : (
          <button className="btn btn-secondary" onClick={handleMintItem}>
            Mint NFT
          </button>
        )}
      </div>
      {/* <MyHoldings /> */}
    </>
  );
};

export default MyNFTs;