"use client"

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { usePublicClient } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import nftsMetadata from "~~/utils/simpleNFT/nftsMetadata";
import styles from "./blindbox.module.css";
import { blindbox_mint_nft } from "../../utils/dbbutil";

const Blindbox: React.FC = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [price] = useState<string>("3"); // Default 3 ETH
  const [isOpening, setIsOpening] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [showNFT, setShowNFT] = useState<boolean>(false);
  const [selectedNFT, setSelectedNFT] = useState<typeof nftsMetadata[0] | null>(null);
  const publicClient = usePublicClient(); // 定义与区块链交互信息的工具
  // Get the mintBlindboxItem method from the contract
  const { writeContractAsync: mintBlindboxAsync } = useScaffoldWriteContract("YourCollectible");

  const handleMintBlindboxItem = async () => {
    if (isOpening) {
      notification.error("You are already opening a blindbox!");
      return;
    }

    setIsOpening(true);
    setIsAnimating(true);
    const notificationId = notification.loading("★正在开箱中★");

    try {
      // Randomly select an NFT
      const randomIndex = Math.floor(Math.random() * nftsMetadata.length);
      const randomNFT = nftsMetadata[randomIndex];
      setSelectedNFT(randomNFT);

      const uploadedItem = await addToIPFS(randomNFT);
      notification.remove(notificationId);
      notification.success("Metadata uploaded to IPFS!");

      const mintTx = await mintBlindboxAsync({
        functionName: "mintBlindboxItem",
        args: [connectedAddress, uploadedItem.IpfsHash, 500], // Default royalty 5%
        value: (3 * 1e18).toString(), // 3 ETH
      });

      console.log("uploadedItem", uploadedItem);

      console.log("------mintTx=" + mintTx);
      const receipt = await publicClient?.getTransactionReceipt({ hash: mintTx as `0x${string}` });
      console.log("------receipt=" + receipt);
      console.log("-------receipt:", receipt);
      console.log("-------gasUsed:", receipt?.gasUsed);
      const nft_id = receipt?.logs[0].topics[3];
      const numericId = parseInt(nft_id as `0x${string}`, 16);
      console.log("numericId=" + numericId);
      const mint_time = new Date().toLocaleString().slice(0, 19).replace(/ /g, '-');
      console.log("-------gasUsed:", receipt?.gasUsed);
      const gasUsed = receipt?.gasUsed.toString();
      if (nft_id) {
        const data = {
          nft_id: numericId,
          token_uri: uploadedItem.IpfsHash,
          mint_time: mint_time,
          owner: connectedAddress,
          creator: connectedAddress,
          state: 0,
          royaltyFeeNumerator: 500,
          gasUsed: gasUsed,
        };
        await blindbox_mint_nft(data);
      }

      notification.success("★恭喜你获得了一个盲盒NFT,快到你的NFT库中查看吧★");

      // Simulate opening animation
      setTimeout(() => {
        setShowNFT(true);
        setIsAnimating(false);
      }, 3000);

    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
      notification.error("Failed to mint your blindbox NFT.");
      setIsAnimating(false);
      setSelectedNFT(null);
    } finally {
      setIsOpening(false);
    }
  };

  useEffect(() => {
    if (!isAnimating && showNFT) {
      const timer = setTimeout(() => {
        setShowNFT(false);
        setSelectedNFT(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, showNFT]);

  return (
    
    <div className={styles.container}>
      <h1 className={styles.title}>抽取盲盒NFT</h1>
      <div className={styles.blindboxContainer}>
        <div 
          className={`${styles.blindBox} ${isAnimating ? styles.animating : ''}`} 
          onClick={handleMintBlindboxItem}
        >
          <div className={`${styles.boxSurface} ${styles.top}`}><div className={styles.insideBorder}>?</div></div>
          <div className={`${styles.boxSurface} ${styles.bottom}`}><div className={styles.insideBorder}>?</div></div>
          <div className={`${styles.boxSurface} ${styles.left}`}><div className={styles.insideBorder}>?</div></div>
          <div className={`${styles.boxSurface} ${styles.right}`}><div className={styles.insideBorder}>?</div></div>
          <div className={`${styles.boxSurface} ${styles.front}`}><div className={styles.insideBorder}>★</div></div>
          <div className={`${styles.boxSurface} ${styles.back}`}><div className={styles.insideBorder}>★</div></div>
          {showNFT && selectedNFT && (
            <div className={styles.boxInside}>
              <img src={selectedNFT.image} alt={selectedNFT.name} className={styles.nftImage} />
            </div>
          )}
        </div>
      </div>
      <div className={styles.info}>
        <h2 className={styles.price}>Price: 3 ETH</h2>
        <p className={styles.description}>
          Pay 3 ETH to mint a random NFT from the Blindbox. Click the box to start your experience!
        </p>
      </div>
    </div>
  );
};

export default Blindbox;

