
const fetchFromApi = async (options: { path: string, method: string, body?: object }) => {
    const { path, method, body } = options;
    const response = await fetch(path, {
        method,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    return response.json();
};

export const mint_nft = (data: object) => {
    console.log("Saving NFT data to DB:", data);
    return fetchFromApi({
        path: "/api/nft/data",
        method: "POST",
        body: { data }
    });
}

export const blindbox_mint_nft = (data: object) => {
    console.log("Saving NFT data to blindbox:", data);
    return fetchFromApi({
        path: "/api/nft/blindbox",
        method: "POST",
        body: { data }
    });
}

export const Batch_mint_NFT = (data: object) => {
    console.log("Saving NFT data to blindbox:", data);
    return fetchFromApi({
        path: "/api/nft/mintBatchNFT",
        method: "POST",
        body: { data }
    });
}

export const place_nft = (data: object) => {
    console.log("place_nft:", data);
    return fetchFromApi({
        path: "/api/nft/place",
        method: "POST",
        body: { data }
    });
}


export const burn_nft = (data: object) => {
    console.log("burn_nft:", data);
    return fetchFromApi({
        path: "/api/nft/data",
        method: "DELETE",
        body: { data }
    });
}
