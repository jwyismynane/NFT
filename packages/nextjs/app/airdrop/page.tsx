"use client"

import { useState } from "react"
import { MerkleTree } from "merkletreejs"
import { isAddress } from "viem"
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth"
import { soliditySha3 } from "web3-utils"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, ChevronLeft, Plus, Trash2, X, Info } from 'lucide-react'

const steps = ["输入地址", "设置 Token ID", "生成树", "查看结果"]

const MerkleTreePage = () => {
  const [addresses, setAddresses] = useState<string[]>([])
  const [newAddress, setNewAddress] = useState<string>("")
  const [startTokenId, setStartTokenId] = useState<number | null>(null)
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null)
  const [proofs, setProofs] = useState<Record<string, string[]> | null>(null)
  const [leaves, setLeaves] = useState<string[]>([])
  const [step, setStep] = useState<number>(0)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible")

  const addAddress = () => {
    if (isAddress(newAddress)) {
      setAddresses([...addresses, newAddress])
      setNewAddress("")
      setError(null)
    } else {
      setError("请输入有效的以太坊地址")
    }
  }

  const removeAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const clearAddresses = () => {
    setAddresses([]);
  };

  const generateMerkleTree = async () => {
    if (addresses.length === 0) {
      setError("地址列表为空，无法生成 Merkle Tree")
      return
    }
    if (startTokenId === null) {
      setError("请指定开始的 Token ID")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const generatedLeaves = addresses.map((addr, index) => {
        const tokenId = startTokenId + index
        const leaf = soliditySha3(
          { type: "address", value: addr },
          { type: "uint256", value: tokenId }
        )
        return leaf
      })
      setLeaves(generatedLeaves.filter((leaf): leaf is string => leaf !== null))

      const tree = new MerkleTree(generatedLeaves, soliditySha3, { sortPairs: true })
      const root = tree.getHexRoot()
      setMerkleRoot(root)

      await writeContractAsync({
        functionName: "setMerkleRoot",
        args: [root as `0x${string}`],
      })

      const generatedProofs: Record<string, string[]> = {}
      addresses.forEach((addr, index) => {
        const tokenId = startTokenId + index
        const leaf = soliditySha3(
          { type: "address", value: addr },
          { type: "uint256", value: tokenId }
        ) as string
        const proof = tree.getHexProof(leaf)
        generatedProofs[`${addr}-${tokenId}`] = proof
      })
      setProofs(generatedProofs)
      setStep(3)
    } catch (err) {
      setError("生成 Merkle Tree 时发生错误")
    } finally {
      setIsGenerating(false)
    }
  }

  const reset = () => {
    setAddresses([])
    setNewAddress("")
    setStartTokenId(null)
    setMerkleRoot(null)
    setProofs(null)
    setLeaves([])
    setStep(0)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden"
      >
        <div className="p-8">
          <h1 className="text-4xl font-bold text-center text-blue-800 mb-2 uppercase tracking-wide">Merkle Tree 生成器</h1>
          <p className="text-center text-gray-600 mb-8">通过 4 个简单步骤创建您的空投 Merkle Tree！</p>

          <div className="mb-8">
            <ul className="flex justify-between">
              {steps.map((stepName, index) => (
                <motion.li
                  key={index}
                  className={`text-sm uppercase tracking-wider ${
                    index <= step ? "text-blue-600 font-semibold" : "text-gray-400"
                  }`}
                  whileHover={{ scale: 1.05 }}
                >
                  {stepName}
                </motion.li>
              ))}
            </ul>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              ></motion.div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1 uppercase">
                    以太坊地址
                  </label>
                  <div className="flex space-x-2">
                    <motion.input
                      id="address"
                      type="text"
                      placeholder="0x..."
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="flex-1 p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 ease-in-out"
                      whileFocus={{ scale: 1.02 }}
                    />
                    <motion.button
                      onClick={addAddress}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all duration-300 ease-in-out"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-700 uppercase">地址列表</h4>
                    <motion.button
                      onClick={clearAddresses}
                      className="text-sm text-red-600 hover:text-red-800 flex items-center"
                      disabled={addresses.length === 0}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      清空所有
                    </motion.button>
                  </div>
                  <div className="h-60 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                    {addresses.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">暂无地址，添加一些地址开始。</p>
                    ) : (
                      <ul className="space-y-2">
                        {addresses.map((addr, index) => (
                          <motion.li
                            key={index}
                            className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center hover:bg-blue-50 transition-colors duration-200"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="break-all text-sm text-gray-700">{addr}</span>
                            <motion.button
                              onClick={() => removeAddress(index)}
                              className="ml-2 text-red-500 hover:text-red-700"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="tokenId" className="block text-sm font-medium text-gray-700 mb-1 uppercase">
                    起始 Token ID
                  </label>
                  <div className="relative">
                    <motion.input
                      id="tokenId"
                      type="number"
                      placeholder="请输入开始的 Token ID"
                      value={startTokenId ?? ""}
                      onChange={(e) => setStartTokenId(Number(e.target.value))}
                      className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 ease-in-out pr-10"
                      whileFocus={{ scale: 1.02 }}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <Info className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Token ID 应为正整数，用作 NFT 的唯一标识符。</p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <p className="text-center text-gray-600">
                  点击下面的按钮生成您的 Merkle Tree 并将根设置到合约中。
                </p>
                <div className="flex justify-center">
                  <motion.button
                    onClick={generateMerkleTree}
                    disabled={isGenerating}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-lg font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all duration-300 ease-in-out disabled:opacity-50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isGenerating ? "生成中..." : "生成 Merkle Tree"}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {merkleRoot && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg"
                  >
                    <h3 className="text-xl font-semibold mb-2 text-white">Merkle Root</h3>
                    <p className="font-mono break-all text-blue-100">{merkleRoot}</p>
                  </motion.div>
                )}
                {leaves && proofs && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-4"
                  >
                    <h3 className="text-2xl font-semibold text-blue-800 mb-4">叶子节点与 Merkle Proofs</h3>
                    <div className="max-h-96 overflow-y-auto rounded-xl shadow-inner bg-gray-50">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              地址和 Token ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              哈希值
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Merkle Proof
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {addresses.map((addr, index) => {
                            const tokenId = startTokenId! + index
                            const key = `${addr}-${tokenId}`
                            return (
                              <motion.tr 
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="hover:bg-blue-50 transition-colors duration-200"
                              >
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500">
                                  {key}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500">
                                  {leaves[index]}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <details>
                                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 transition-colors duration-200">查看 Proof</summary>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                      {proofs[key].map((p, i) => (
                                        <li key={i} className="font-mono text-xs break-all">
                                          {p}
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                </td>
                              </motion.tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex justify-between">
            <motion.button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              上一步
            </motion.button>
            <motion.button
              onClick={() => {
                if (step === 2) {
                  generateMerkleTree()
                } else if (step === 3) {
                  reset()
                } else {
                  setStep(step + 1)
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {step === 3 ? "重置" : step === 2 ? "生成" : "下一步"}
              {step !== 3 && <ChevronRight className="w-5 h-5 ml-2" />}
            </motion.button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-4 right-4 max-w-md bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setError(null)}
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MerkleTreePage

