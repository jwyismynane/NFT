import { connectToDatabase } from "~~/utils/db";
import { NextRequest, NextResponse } from "next/server";

// 处理NFT上架请求
export async function POST (request: NextRequest) {
    try {
        console.log("NFT上架请求");
       // 解析请求体为JSON
       const data = await request.json();
       console.log(data);
       // 连接到数据库
       const connection = await connectToDatabase();
       const data2 = data.data;
       console.log("dasdasdasdasd",data2);

       console.log("ndasdjasidjaskldasdjasdjskadjsaldsajl",data2);
       console.log("Listingmethod",data2.Listingmethod);

        // 检查是否提供了nft_id
        if (!data2.nft_id) {
            return new NextResponse(JSON.stringify({ error: "NFT ID is required" }), { status: 400 });
        }

        // 执行更新操作
        await connection?.execute(
            `UPDATE nfts SET  price = ?, duration = ?, isListed = ?,Listingmethod = ? WHERE nft_id = ?`,
            [data2.price, data2.duration, data2.isListed, data2.Listingmethod, data2.nft_id ]
        );

        // 返回成功响应
        return new NextResponse(JSON.stringify({ message: "NFT isListed updated to true successfully" }), { status: 200 });
    } catch (error) {
        console.error("Error updating NFT isListed to true", error);
        // 返回错误响应
        return new NextResponse(JSON.stringify({ error: "Error updating NFT isListed to true" }), { status: 500 });
    }
}

// 处理修改NFT上架方式的请求
// export async function UPDATE (request: NextRequest) {
//     try {
//        // 解析请求体为JSON
//        const data = await request.json();

//        // 连接到数据库
//        const connection = await connectToDatabase();
//        const data2 = data.data;

//         // 检查是否提供了nft_id
//         if (!data2.nft_id) {
//             return new NextResponse(JSON.stringify({ error: "NFT ID is required" }), { status: 400 });
//         }

//         // 执行更新操作
//         await connection?.execute(
//             `UPDATE nfts SET isListed = ? WHERE nft_id = ?`,
//             [true, data2.nft_id]
//         );

//         // 返回成功响应
//         return new NextResponse(JSON.stringify({ message: "NFT isListed updated to true successfully" }), { status: 200 });
//     } catch (error) {
//         console.error("Error updating NFT isListed to true", error);
//         // 返回错误响应
//         return new NextResponse(JSON.stringify({ error: "Error updating NFT isListed to true" }), { status: 500 });
//     }
// }

