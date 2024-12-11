"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  BugAntIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi"; // 使用 wagmi 来获取账户地址

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "My NFTs",
    href: "/myNFTs",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  {
    label: "mint Batch",
    href: "/mintBatchItems",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  {
    label: "Custom Minting",
    href: "/customMinting",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  {
    label: "Market",
    href: "/market",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  {
    label: "Blindbox",
    href: "/Blindbox",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  // 根据条件显示或隐藏 AirDrop
  {
    label: "AirDrop",
    href: "/airdrop",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  {
    label: "Receive",
    href: "/receive",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  {
    label: "Auction",
    href: "/auction",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  // {
  //   label: "Transfers",
  //   href: "/transfers",
  //   icon: <ArrowPathIcon className="h-4 w-4" />,
  // },
  {
    label: "Debug Contracts",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
const account = useAccount(); // 直接使用 useAccount

  const currentAddress = account?.address || ""; // 如果没有连接账户，返回空字符串

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        // 如果是 AirDrop 菜单项并且账户不是目标地址，则跳过渲染
        if (label === "AirDrop" && currentAddress !== "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") {
          return null; // 不显示 AirDrop 菜单项
        }

        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-secondary shadow-md" : ""
              } hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), []),
  );

  return (
    <div className="sticky xl:static top-0 navbar bg-primary min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="navbar-start w-auto xl:w-1/2">
        <div className="xl:hidden dropdown" ref={burgerMenuRef}>
          <label
            tabIndex={0}
            className={`ml-1 btn btn-ghost ${isDrawerOpen ? "hover:bg-secondary" : "hover:bg-transparent"}`}
            onClick={() => {
              setIsDrawerOpen(prevIsOpenState => !prevIsOpenState);
            }}
          >
            <Bars3Icon className="h-1/2" />
          </label>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
              onClick={() => {
                setIsDrawerOpen(false);
              }}
            >
              <HeaderMenuLinks />
            </ul>
          )}
        </div>
        <Link href="/" passHref className="hidden xl:flex items-center gap-1 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="SE2 logo" className="cursor-pointer" fill src="/logo.svg" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight">SRE Challenges</span>
            <span className="text-xs">#0: Simple NFT</span>
          </div>
        </Link>
        <ul className="hidden xl:flex xl:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end flex-grow mr-4">
        <RainbowKitCustomConnectButton />
        <FaucetButton />
      </div>
    </div>
  );
};
