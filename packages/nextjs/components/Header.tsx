"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bars3Icon,
  PhotoIcon,
  CubeIcon,
  ShoppingCartIcon,
  GiftIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";

// 定义导航项的类型
type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
};

// 定义所有导航项
const navItems: NavItem[] = [
  { 
    label: "我的NFT", 
    href: "/myNFTs", 
    icon: <PhotoIcon className="h-6 w-6" />,
    description: "查看和管理您的NFT收藏"
  },
  { 
    label: "批量铸造", 
    href: "/mintBatchItems", 
    icon: <CubeIcon className="h-6 w-6" />,
    description: "一次性创建多个NFT"
  },
  { 
    label: "自定义铸造", 
    href: "/customMinting", 
    icon: <WrenchScrewdriverIcon className="h-6 w-6" />,
    description: "创建独特的、定制化的NFT"
  },
  { 
    label: "市场", 
    href: "/market", 
    icon: <ShoppingCartIcon className="h-6 w-6" />,
    description: "浏览和交易NFT"
  },
  { 
    label: "盲盒", 
    href: "/Blindbox", 
    icon: <GiftIcon className="h-6 w-6" />,
    description: "参与神秘的NFT盲盒活动"
  },
  { 
    label: "空投", 
    href: "/airdrop", 
    icon: <CurrencyDollarIcon className="h-6 w-6" />,
    description: "生成默克尔树"
  },
  { 
    label: "接收", 
    href: "/receive", 
    icon: <CurrencyDollarIcon className="h-6 w-6" />,
    description: "领取免费的NFT空投"
  },
  { 
    label: "拍卖", 
    href: "/auction", 
    icon: <CurrencyDollarIcon className="h-6 w-6" />,
    description: "参与NFT拍卖活动"
  },
  { 
    label: "调试合约", 
    href: "/debug", 
    icon: <WrenchScrewdriverIcon className="h-6 w-6" />,
    description: "开发者工具：调试智能合约"
  },
];

// 导航项组件
const NavItem = ({ item, isActive }: { item: NavItem; isActive: boolean }) => (
  <motion.li 
    whileHover={{ scale: 1.05 }} 
    whileTap={{ scale: 0.95 }}
    className="relative group"
  >
    <Link
      href={item.href}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
        isActive 
          ? "bg-primary text-primary-content" 
          : "text-base-content hover:bg-primary/10"
      } transition-all duration-200`}
    >
      {item.icon}
      <span className="ml-3">{item.label}</span>
    </Link>
    <div className="absolute left-0 w-48 p-2 mt-2 bg-base-100 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 invisible group-hover:visible z-10">
      <p className="text-xs text-base-content/70">{item.description}</p>
    </div>
  </motion.li>
);

// 主导航栏组件
export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), []),
  );

  const pathname = usePathname();
  const account = useAccount();
  const currentAddress = account?.address || "";

  // 根据当前用户地址过滤导航项
  const filteredNavItems = navItems.filter(item => 
    item.label !== "空投" || currentAddress === "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  );

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-gradient-to-r from-base-100 to-base-300 shadow-md">
      <div className="flex items-center">
        <Link href="/" className="flex items-center mr-4">
          <Image src="/logo.svg" alt="Logo" width={40} height={40} />
          <div className="ml-2 text-lg font-bold">NFT 平台</div>
        </Link>
        
        {/* 桌面端导航 */}
        <nav className="hidden lg:flex space-x-1">
          {filteredNavItems.map((item) => (
            <NavItem key={item.href} item={item} isActive={pathname === item.href} />
          ))}
        </nav>
        
        {/* 移动端菜单按钮 */}
        <div className="lg:hidden" ref={burgerMenuRef}>
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="p-2 text-base-content hover:bg-base-300 rounded-md"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          {/* 移动端抽屉式菜单 */}
          <AnimatePresence>
            {isDrawerOpen && (
              <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="fixed inset-y-0 left-0 z-40 w-64 bg-base-100 shadow-lg"
              >
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-4">菜单</h2>
                  <nav className="space-y-2">
                    {filteredNavItems.map((item) => (
                      <NavItem key={item.href} item={item} isActive={pathname === item.href} />
                    ))}
                  </nav>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* 右侧按钮 */}
      <div className="flex items-center space-x-2">
        <RainbowKitCustomConnectButton />
        <FaucetButton />
      </div>
    </div>
  );
};

