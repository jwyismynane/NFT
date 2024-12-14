import { connectToDatabase } from "~~/utils/db";
import { NextRequest, NextResponse } from "next/server";

// 铸造NFT传入数据库
export async function POST(request: NextRequest) {

    try {
        // 解析请求体为JSON
        const data = await request.json();
        // 连接到数据库
        const connection = await connectToDatabase();
        const data2 = data.data;
        // 执行插入操作
        await connection?.execute(
            `INSERT INTO nfts (nft_id, name, description, image, mint_time, owner, creator, royaltyFeeNumerator, gasused) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data2.nft_id, data2.name, data2.description, data2.image, data2.mint_time, data2.owner, data2.creator, data2.royaltyFeeNumerator, data2.gasused]
        );
        // 返回成功响应
        return new NextResponse(JSON.stringify({ message: "NFT saved to DB successfully" }), { status: 200 });
    } catch (error) {
        console.log("Error saving NFT to DB", error);
        // 返回错误响应
        return new NextResponse(JSON.stringify({ error: "Error saving NFT to DB" }), { status: 500 });
    }
}

//销毁NFT 
export async function DELETE(request: NextRequest) {
    try {
        // 解析请求体为JSON
        const data = await request.json();

        const connection = await connectToDatabase();
        // 定义变量接受data数据
        const data2 = data.data;
        console.log("接收到需要销毁的NFT的ID为:", data);

        // 使用变量data2对后续的方法进行数据操作
        console.log("后续需要使用此变量进行操作data2", data2);

        // 检查是否提供了nft_id
        if (!data2.nft_id) {
            return new NextResponse(JSON.stringify({ error: "NFT ID is required" }), { status: 400 });
        }

        // 执行删除操作
        await connection?.execute(
            `DELETE FROM nfts WHERE nft_id = ?`,
            [data2.nft_id]
        );

        // 返回成功响应
        return new NextResponse(JSON.stringify({ message: "NFT deleted successfully" }), { status: 200 });
    } catch (error) {
        console.error("Error deleting NFT", error);
        // 返回错误响应
        return new NextResponse(JSON.stringify({ error: "Error deleting NFT" }), { status: 500 });
    }
}