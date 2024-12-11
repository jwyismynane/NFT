import React, { useState } from "react";
import { Collectible } from "./MyHoldings";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { mint_nft, place_nft, burn_nft } from "../../../utils/dbbutil";

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
          notification.error("Please enter a valid address.");
          return;
        }
        await writeContractAsync({
          functionName: "transferFrom",
          args: [nft.owner, transferToAddress, BigInt(nft.id.toString())],
        });
        notification.success("NFT transferred successfully!");
      } else if (actionType === "list") {
        if (!price || !endTime) {
          notification.error("Please enter a price and end time.");
          return;
        }
        const parsedPrice = parseFloat(price);
        const parsedEndTime = new Date(endTime).getTime() / 1000;
        const currentTime = Math.floor(Date.now() / 1000);
        const duration = parsedEndTime - currentTime;

        if (isNaN(parsedPrice) || duration <= 0) {
          notification.error("Invalid price or end time. Please check your inputs.");
          return;
        }

        if (saleType === "auction") {
          // 竞拍上架逻辑
          const minBidIncrement = parsedPrice * 1; // Minimum bid increment (e.g., 1%)
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
          notification.success("NFT listed for auction successfully!");
        } else if (saleType === "blind") {
          // 盲盒上架逻辑
          await writeContractAsync({
            functionName: "placeNftOnSale",
            args: [nft.id, parsedPrice, duration, true], // `true` for blind sale
          });
          const metadata = {
            nft_id: nft.id,
            price: parsedPrice,
            duration: duration,
            Listingmethod: "blind",
            isListed: "true",
          }
          await place_nft(metadata)
          notification.success("NFT listed for blind sale successfully!");
        } else {
          // 正常上架逻辑
          await writeContractAsync({
            functionName: "placeNftOnSale",
            args: [nft.id, parsedPrice, duration, false], // `false` for normal sale
          });
          const metadata = {
            nft_id: nft.id,
            price: parsedPrice,
            duration: duration,
            Listingmethod: "normal",
            isListed: "true",
          }
          await place_nft(metadata)
          notification.success("NFT listed for normal sale successfully!");
        }
      } else if (actionType === "burn") {
        // 销毁逻辑
        const notificationId = notification.loading("Burning NFT...");
        await writeContractAsync({
          functionName: "burn",
          args: [nft.id],
        });
        const nft_id = nft.id; // 获取要销毁的NFT ID
        
        await burn_nft({ nft_id: nft_id }); // 调用后端接口销毁NFT


        notification.remove(notificationId);
        notification.success("NFT burned successfully!");
      }
    } catch (error) {
      console.error("Error executing action:", error);
      notification.error("Failed to execute the selected action.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl max-w-sm mx-auto">
      <div className="relative">
        <img src={nft.image} alt="NFT Image" className="w-full h-64 object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <span className="text-white text-xl font-bold">#{nft.id}</span>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-800">{nft.name}</h3>
          <div className="flex space-x-2">
            {nft.attributes?.map((attr, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {attr.value}
              </span>
            ))}
          </div>
        </div>
        <p className="text-gray-600">{nft.description}</p>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span className="font-medium">Owner:</span>
          <Address address={nft.owner} />
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type:</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={actionType}
              onChange={e => setActionType(e.target.value as "transfer" | "list" | "burn")}
            >
              <option value="transfer">Transfer</option>
              <option value="list">List for Sale</option>
              <option value="burn">Burn</option>
            </select>
          </div>

          {actionType === "transfer" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transfer To:</label>
              <AddressInput
                value={transferToAddress}
                placeholder="Receiver address"
                onChange={newValue => setTransferToAddress(newValue)}
              />
            </div>
          )}

          {actionType === "list" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Type:</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={saleType}
                  onChange={e => setSaleType(e.target.value as "normal" | "auction" | "blind")}
                >
                  <option value="normal">Normal Sale</option>
                  <option value="auction">Auction</option>
                  <option value="blind">Blind Sale</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (ETH):</label>
                <input
                  type="number"
                  placeholder="Enter price"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time:</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
        <div className="mt-6">
          <button
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-300"
            onClick={handleAction}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

