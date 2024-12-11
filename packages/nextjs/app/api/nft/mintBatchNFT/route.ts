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
            `INSERT INTO mintbatch (name, description, image, royaltyValue) VALUES (  ?, ?, ?, ? )`,
            [data2.name, data2.description, data2.image, data2.royaltyValue]
        );
        // 返回成功响应
        return new NextResponse(JSON.stringify({ message: "NFT saved to DB successfully" }), { status: 200 });
    } catch (error) {
        console.log("Error saving NFT to DB", error);
        // 返回错误响应
        return new NextResponse(JSON.stringify({ error: "Error saving NFT to DB" }), { status: 500 });
    }
}
