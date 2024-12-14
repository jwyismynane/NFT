"use client";

import { MyHoldings } from "./_components";
import type { NextPage } from "next";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import nftsMetadata from "~~/utils/simpleNFT/nftsMetadata";
import { usePublicClient } from "wagmi";
import { Modal } from "antd";
import { place_nft, burn_nft } from "../../utils/dbbutil";

const MyNFTs: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [selectedNFT, setSelectedNFT] = useState<number | null>(null);
  const [price, setPrice] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");// 用户选择的截止时间
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBlindAuction, setIsBlindAuction] = useState<boolean>(false);
  const [royaltyPercentage, setRoyaltyPercentage] = useState<number>(0); // 存储读取到的版税比例
  const [selectedSaleType, setSelectedSaleType] = useState<"normal" | "blind" | "auction" | null>(null);
  const [auctionList, setAuctionList] = useState<any[]>([]); // 存储拍卖的 NFT 信息
  const publicClient = usePublicClient(); // 定义与区块链交互信息的工具

  // 获取合约的mint和placeNftOnSale方法
  const { writeContractAsync: mintItemAsync } = useScaffoldWriteContract("YourCollectible");
  const { writeContractAsync: placeNftOnSaleAsync } = useScaffoldWriteContract("YourCollectible");
  const { writeContractAsync: BurnItemAsync } = useScaffoldWriteContract("YourCollectible");

  const { data: tokenIdCounter } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "tokenIdCounter",
    watch: true,
  });

  // 控制弹框的显示

  // 打开弹框
  const openModal = () => setIsModalOpen(true);

  // 关闭弹框
  const closeModal = () => setIsModalOpen(false);

  // 确定选择
  const handleSaleTypeSelect = (type: "normal" | "blind" | "auction") => {
    setSelectedSaleType(type);
    setIsBlindAuction(type === "blind"); // 如果选择盲拍，则设置对应状态
    setIsModalOpen(false);
  };

  // 在组件挂载时读取选中的NFT的版税比例
  useEffect(() => {
    const fetchRoyaltyPercentage = async () => {
      if (selectedNFT !== null) {
        const { data: royaltyPercentageData } = await useScaffoldReadContract({
          contractName: "YourCollectible",
          functionName: "getRoyaltyPercentage",
          args: [selectedNFT],
        });
        setRoyaltyPercentage(royaltyPercentageData || 0);
      }
    };

    fetchRoyaltyPercentage();
  }, [selectedNFT]);

  //铸币逻辑
  const handleMintItem = async () => {
    if (tokenIdCounter === undefined) return;

    const tokenIdCounterNumber = Number(tokenIdCounter);
    const currentTokenMetaData = nftsMetadata[tokenIdCounterNumber % nftsMetadata.length];
    const notificationId = notification.loading("Uploading to IPFS");

    try {
      const uploadedItem = await addToIPFS(currentTokenMetaData);
      notification.remove(notificationId);
      notification.success("上传文件");

      // 传递版税百分比
      const mintTx = await mintItemAsync({
        functionName: "mintItem",
        args: [connectedAddress, uploadedItem.IpfsHash, parseInt(currentTokenMetaData.royaltyPercentage)],
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
        await default_mint_nft(data);
      }

    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
    }
  };

  // 计算上架费用
  const calculateListingFee = (price: number) => {
    // 假设上架费用是价格的1%
    return price * 0.01;
  };

  // 上架逻辑
  const handlePlaceNftOnSale = async () => {
    if (selectedNFT === null || price === "" || endTime === "") {
      notification.error("Please select an NFT, enter a price, and specify the end time.");
      return;
    }

    const parsedPrice = parseFloat(price);
    const parsedEndTime = new Date(endTime).getTime() / 1000;// 转换为Unix时间戳
    const currentTime = Math.floor(Date.now() / 1000);// 当前时间的Unix时间戳
    const duration = parsedEndTime - currentTime;// 计算持续时间


    if (isNaN(parsedPrice) || isNaN(parsedEndTime) || duration <= 0) {
      notification.error("Invalid price or end time. Please enter valid values.");
      return;
    }

    const notificationId = notification.loading("Placing NFT on sale...");
    try {
      const priceInWei = parsedPrice;
      const isAuction = selectedSaleType === "auction";

      const auction = "auction";
      const blind = "blind";
      const normal = "normal";
      if (isAuction) {
        const minBidIncrement = priceInWei * 1; // 设置最低加价为起拍价的1%
        const royaltyPercentage = 500; // 设置版税比例（假设为5%）

        // 调用合约中的createAuction函数来创建拍卖
        await placeNftOnSaleAsync({
          functionName: "createAuction",
          args: [
            selectedNFT, // tokenId
            priceInWei, // 起拍价
            minBidIncrement, // 最低加价
            duration, // 拍卖持续时间
          ],
        });

        setAuctionList((prev) => [...prev, { id: selectedNFT, price: parsedPrice, endTime }]);
        if (isAuction) {
          const metadata = {
            nft_id: selectedNFT,
            price: priceInWei,
            duration: duration,
            Listingmethod: auction,
            isListed: "true",
          }
          await place_nft(metadata)
        }
      } else {
        // 如果是普通销售或盲拍，调用 placeNftOnSale 函数
        await placeNftOnSaleAsync({
          functionName: "placeNftOnSale",
          args: [selectedNFT, priceInWei, duration, isBlindAuction],
        });
        // 如果是盲盒则修改NFT的Listingmethod上架方式
        if (isBlindAuction === true) {
          const metadata = {
            nft_id: selectedNFT,
            price: priceInWei,
            duration: duration,
            Listingmethod: blind,
            isListed: "true",
          }
          await place_nft(metadata)
          // 如果是拍卖则修改NFT的Listingmethod上架方式
        } else {
          const metadata = {
            nft_id: selectedNFT,
            price: priceInWei,
            duration: duration,
            Listingmethod: normal,
            isListed: "true",
          }
          await place_nft(metadata)
        }

      }

      notification.remove(notificationId);
      notification.success("NFT placed on sale successfully!");
    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
      notification.error("Failed to place NFT on sale.");
    }
  };

  // 销毁逻辑
  const handleBurnItem = async () => {
    if (selectedNFT === null) {
      notification.error("Please select an NFT to burn.");
      return;
    }

    const notificationId = notification.loading("Burning NFT...");
    try {
      // 调用合约中的burn方法销毁NFT
      await BurnItemAsync({
        functionName: "burn",
        args: [selectedNFT],
      });

      const nft_id = selectedNFT; // 获取要销毁的NFT ID
      await burn_nft({ nft_id: nft_id }); // 调用后端接口销毁NFT

      notification.remove(notificationId);
      notification.success("NFT burned successfully!");
    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
      notification.error("Failed to burn NFT.");
    }
  };


  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100  ">
        <div className="px-5 from-purple-100 to-indigo-200">
          <h1 className="text-center mb-8 flex items-center flex-col pt-10 ">
            <span className="text-4xl md:text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">My NFTs</span>
          </h1>
          <div>
            {/* <select
              value={selectedNFT || ""}
              onChange={(e) => setSelectedNFT(Number(e.target.value))}
              className="input"
            >
              <option value="">Select NFT to List</option>
              {tokenIdCounter &&
                [...Array(Number(tokenIdCounter)).keys()].map((i) => (
                  <option key={i} value={i + 1}>
                    {`NFT ID: ${i + 1}`}
                  </option>
                ))}
            </select> */}

            {/* <input
              type="text"
              placeholder="Enter price in ETH"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input"
            />
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input"
            />
            <button className="btn btn-secondary mt-4" onClick={openModal}>
              Select Sale Type
            </button> */}

          </div>
        </div>

        {/* <Modal title="Select Sale Type" open={isModalOpen} onCancel={closeModal} footer={null}>
          <div className="flex flex-col gap-4">
            <button className="btn btn-primary" onClick={() => handleSaleTypeSelect("normal")}>
              Normal Sale
            </button>
            <button className="btn btn-primary" onClick={() => handleSaleTypeSelect("blind")}>
              Blind Auction
            </button>
            <button className="btn btn-primary" onClick={() => handleSaleTypeSelect("auction")}>
              Auction
            </button>
          </div>
        </Modal>

        <button className="btn btn-primary mt-4" onClick={handlePlaceNftOnSale}>
          Place NFT On Sale
        </button> */}

        <div className="flex justify-center mt-6">
          {!isConnected || isConnecting ? (
            <RainbowKitCustomConnectButton />
          ) : (
            <button className="btn btn-secondary" onClick={handleMintItem}>
              Mint NFT
            </button>
          )}
        </div>

        {/* <button className="btn btn-danger mt-4" onClick={handleBurnItem}>
          Burn NFT
        </button> */}

        <MyHoldings />
      </div>
    </>
  );
};

export default MyNFTs;
