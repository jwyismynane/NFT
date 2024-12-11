"use client"

import { useState } from "react"
import { MerkleTree } from "merkletreejs"
import { isAddress } from "viem"
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth"
import { soliditySha3 } from "web3-utils"

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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-3xl font-bold text-center text-black mb-2">Merkle Tree 生成器</h1>
        <p className="text-center text-gray-800 mb-6">通过 4 个简单步骤创建您的空投 Merkle Tree！</p>

        <div className="mb-6">
          <ul className="flex justify-between">
            {steps.map((stepName, index) => (
              <li
                key={index}
                className={`text-sm ${
                  index <= step ? "text-blue-600 font-semibold" : "text-gray-800"
                }`}
              >
                {stepName}
              </li>
            ))}
          </ul>
          <div className="mt-2 h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-800 mb-1">
                以太坊地址
              </label>
              <div className="flex space-x-2">
                <input
                  id="address"
                  type="text"
                  placeholder="0x..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="flex-1 p-2 border rounded-md"
                />
                <button
                  onClick={addAddress}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-800">地址列表</h4>
                <button
                  onClick={clearAddresses}
                  className="text-sm text-red-600 hover:text-red-800"
                  disabled={addresses.length === 0}
                >
                  清空所有
                </button>
              </div>
              <div className="h-60 overflow-y-auto border rounded-md p-2">
                {addresses.length === 0 ? (
                  <p className="text-gray-800">暂无地址，添加一些地址开始。</p>
                ) : (
                  <ul className="space-y-2">
                    {addresses.map((addr, index) => (
                      <li key={index} className="bg-gray-800 p-2 rounded-md flex justify-between items-center">
                        <span className="break-all">{addr}</span>
                        <button
                          onClick={() => removeAddress(index)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          删除
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="tokenId" className="block text-sm font-medium text-gray-700 mb-1">
                起始 Token ID
              </label>
              <input
                id="tokenId"
                type="number"
                placeholder="请输入开始的 Token ID"
                value={startTokenId ?? ""}
                onChange={(e) => setStartTokenId(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-center text-gray-600">
              点击下面的按钮生成您的 Merkle Tree 并将根设置到合约中。
            </p>
            <div className="flex justify-center">
              <button
                onClick={generateMerkleTree}
                disabled={isGenerating}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isGenerating ? "生成中..." : "生成 Merkle Tree"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            {merkleRoot && (
              <div className="p-4 bg-gray-600 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Merkle Root</h3>
                <p className="font-mono break-all">{merkleRoot}</p>
              </div>
            )}
            {leaves && proofs && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-black mb-2">叶子节点与 Merkle Proofs</h3>
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-600">
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
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500">
                              {key}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500">
                              {leaves[index]}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <details>
                                <summary className="cursor-pointer">查看 Proof</summary>
                                <ul className="list-disc list-inside mt-2">
                                  {proofs[key].map((p, i) => (
                                    <li key={i} className="font-mono text-xs break-all">
                                      {p}
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            上一步
          </button>
          <button
            onClick={() => {
              if (step === 2) {
                generateMerkleTree()
              } else if (step === 3) {
                reset()
              } else {
                setStep(step + 1)
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {step === 3 ? "重置" : step === 2 ? "生成" : "下一步"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <h3 className="font-bold">错误</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}

export default MerkleTreePage

