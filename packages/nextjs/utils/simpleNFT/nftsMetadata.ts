const nftsMetadata = [
  {
    tokenId: 1,
    description: "A majestic lion with a colorful mane.",
    external_url: "https://www.nftcn.com.cn",
    image: "https://img3.wallspic.com/previews/3/1/1/5/4/145113/145113-mei_sai_de_si_ben_chie_ji-mei_sai_de_si_ben_chicla_lei-zhong_deng_chi_cun_de_qi_che-chao_ji_pao_che-mei_sai_de_si_ben_chi-x750.jpg",
    name: "Lion",
    royaltyPercentage: "500",
    attributes: [
      { trait_type: "ManeColor", value: "golden" },
      { trait_type: "Eyes", value: "sharp" },
      { trait_type: "Strength", value: 95 },
    ],
  },
  {
    tokenId: 2,
    description: "A mysterious owl that watches over the night.",
    external_url: "https://www.nftcn.com.cn",
    image: "https://img1.wallspic.com/previews/2/4/7/5/7/175742/175742-hong_se_de-yi_shu-shen_hong_se_de-tu_xing_she_ji-fang-x750.jpg",
    name: "Owl",
    royaltyPercentage: "500",
    attributes: [
      { trait_type: "FeatherColor", value: "midnight blue" },
      { trait_type: "Eyes", value: "piercing" },
      { trait_type: "Wisdom", value: 100 },
    ],
  },
  {
    tokenId: 3,
    description: "A playful dolphin who loves to surf the waves.",
    external_url: "https://www.nftcn.com.cn",
    image: "https://img3.wallspic.com/previews/8/1/7/7/6/167718/167718-hoodie_guy_with_magical_universe-x750.jpg",
    name: "Dolphin",
    royaltyPercentage: "500",
    attributes: [
      { trait_type: "FinColor", value: "turquoise" },
      { trait_type: "Smile", value: "cheerful" },
      { trait_type: "Agility", value: 88 },
    ],
  },
  {
    tokenId: 4,
    description: "A mysterious jellyfish glowing in the deep sea.",
    external_url: "https://www.nftcn.com.cn",
    image: "https://img3.wallspic.com/previews/1/3/3/1/7/171331/171331-pu_ke-da_ka-du_chang-du_bo-bai_se-x750.jpg",
    name: "Jellyfish",
    royaltyPercentage: "500",
    attributes: [
      { trait_type: "GlowColor", value: "neon pink" },
      { trait_type: "TentacleLength", value: "long" },
      { trait_type: "DangerLevel", value: 72 },
    ],
  },
  {
    tokenId: 5,
    description: "A gentle unicorn with a shimmering mane.",
    external_url: "https://www.nftcn.com.cn",
    image: "https://img3.wallspic.com/previews/8/6/6/8/6/168668/168668-zhi_neng_shou_ji-tao-dian_lan_se_de-dian_zi_she_bei-kong_jian-x750.jpg",
    name: "Unicorn",
    royaltyPercentage: "500",
    attributes: [
      { trait_type: "HornColor", value: "iridescent silver" },
      { trait_type: "ManeColor", value: "pastel rainbow" },
      { trait_type: "MagicPower", value: 85 },
    ],
  },
];

export type NFTMetaData = (typeof nftsMetadata)[number];

export default nftsMetadata;

