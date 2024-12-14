import React, { useState } from "react";
import { Collectible } from "./MyHoldings";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { mint_nft, place_nft, burn_nft } from "../../../utils/dbbutil";
import { motion } from "framer-motion";

export const NFTCard = ({ nft }: { nft: Collectible }) => {
  const [transferToAddress, setTransferToAddress] = useState("");
  const [price, setPrice] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [actionType, setActionType] = useState<"transfer" | "list" | "burn">("transfer");
  const [saleType, setSaleType] = useState<"normal" | "auction" | "blind">("normal");

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  const handleAction = async () => {
    try {
      if (actionType === "transfer") {
        if (!transferToAddress) {
          showNotification("error", "请输入有效地址哦～");
          return;
        }
        await writeContractAsync({
          functionName: "transferFrom",
          args: [nft.owner, transferToAddress, BigInt(nft.id.toString())],
        });
        showNotification("success", "NFT 转移成功啦！");
      } else if (actionType === "list") {
        if (!price || !endTime) {
          showNotification("error", "别忘了填写价格和结束时间哦～");
          return;
        }
        const parsedPrice = parseFloat(price);
        const parsedEndTime = new Date(endTime).getTime() / 1000;
        const currentTime = Math.floor(Date.now() / 1000);
        const duration = parsedEndTime - currentTime;

        if (isNaN(parsedPrice) || duration <= 0) {
          showNotification("error", "价格或结束时间不对劲，再检查一下吧～");
          return;
        }

        if (saleType === "auction") {
          const minBidIncrement = parsedPrice * 1;
          await writeContractAsync({
            functionName: "createAuction",
            args: [nft.id, parsedPrice, minBidIncrement, duration],
          });
          const metadata = {
            nft_id: nft.id,
            price: parsedPrice,
            duration: duration,
            Listingmethod: "auction",
            isListed: "true",
          }
          await place_nft(metadata)
          showNotification("success", "NFT 拍卖开始啦，快来竞价吧！");
        } else if (saleType === "blind") {
          await writeContractAsync({
            functionName: "placeNftOnSale",
            args: [nft.id, parsedPrice, duration, true],
          });
          const metadata = {
            nft_id: nft.id,
            price: parsedPrice,
            duration: duration,
            Listingmethod: "blind",
            isListed: "true",
          }
          await place_nft(metadata)
          showNotification("success", "神秘盲盒已上架，等待惊喜揭晓！");
        } else {
          await writeContractAsync({
            functionName: "placeNftOnSale",
            args: [nft.id, parsedPrice, duration, false],
          });
          const metadata = {
            nft_id: nft.id,
            price: parsedPrice,
            duration: duration,
            Listingmethod: "normal",
            isListed: "true",
          }
          await place_nft(metadata)
          showNotification("success", "NFT 已成功上架，等待新主人！");
        }
      } else if (actionType === "burn") {
        const notificationId = showNotification("loading", "正在销毁 NFT，请稍等...");
        await writeContractAsync({
          functionName: "burn",
          args: [nft.id],
        });
        const nft_id = nft.id;
        await burn_nft({ nft_id: nft_id });
        notification.remove(notificationId);
        showNotification("success", "NFT 已成功销毁，化为星尘！");
      }
    } catch (error) {
      console.error("执行操作时出错:", error);
      showNotification("error", "哎呀，操作失败了，再试一次吧！");
    }
  };

  const showNotification = (type: "success" | "error" | "loading", message: string) => {
    const notificationStyle = {
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: 'bold',
    };

   
  };

  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl max-w-sm mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        y: -5,
      }}
    >
      <div className="relative">
        <motion.img
          src={nft.image}
          alt="NFT Image"
          className="w-full h-64 object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <motion.span
            className="text-white text-2xl font-bold"
            style={{
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              background: "linear-gradient(45deg, #3494E6, #EC6EAD)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
            whileHover={{ scale: 1.1 }}
          >
            #{nft.id}
          </motion.span>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <motion.h3
            className="text-2xl font-bold text-gray-800"
            style={{ letterSpacing: "0.05em" }}
            whileHover={{ scale: 1.05 }}
          >
            {nft.name}
          </motion.h3>
          <div className="flex space-x-2">
            {nft.attributes?.map((attr, index) => (
              <motion.span
                key={index}
                className="px-3 py-1 text-xs font-medium rounded-full"
                style={{
                  background: `linear-gradient(45deg, ${getRandomColor()}, ${getRandomColor()})`,
                  color: "#ffffff",
                }}
                whileHover={{ scale: 1.1 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                {attr.value}
              </motion.span>
            ))}
          </div>
        </div>
        <p className="text-gray-600">{nft.description}</p>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <motion.span
            className="font-medium flex items-center"
            whileHover={{ scale: 1.05 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            Owner:
          </motion.span>
          <Address address={nft.owner} />
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择操作:</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
              value={actionType}
              onChange={e => setActionType(e.target.value as "transfer" | "list" | "burn")}
            >
              <option value="transfer">转移</option>
              <option value="list">上架出售</option>
              <option value="burn">销毁</option>
            </select>
          </div>

          {actionType === "transfer" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">转移给:</label>
              <AddressInput
                value={transferToAddress}
                placeholder="输入接收者地址"
                onChange={newValue => setTransferToAddress(newValue)}
              />
            </motion.div>
          )}

          {actionType === "list" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">销售类型:</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  value={saleType}
                  onChange={e => setSaleType(e.target.value as "normal" | "auction" | "blind")}
                >
                  <option value="normal">普通销售</option>
                  <option value="auction">拍卖</option>
                  <option value="blind">盲盒销售</option>
                </select>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">价格 (ETH):</label>
                <input
                  type="number"
                  placeholder="输入你心仪的价格哟～"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">结束时间:</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                />
              </div>
            </motion.div>
          )}
        </div>
        <motion.div
          className="mt-6"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <button
            className="w-full py-2 px-4 rounded-md text-white font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={handleAction}
            style={{
              boxShadow: "0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08)",
              textShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
            }}
          >
            确认操作
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

function getRandomColor() {
  return `#${Math.floor(Math.random()*16777215).toString(16)}`;
}

export default NFTCard;

