import { NextResponse } from "next/server"
import { getAvailableModels } from "@/lib/openai"

export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json().catch((error) => {
      console.error("Error parsing request body:", error)
      return null
    })

    if (!body) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
    }

    const { openaiApiKey, openaiBaseUrl } = body as {
      openaiApiKey?: string
      openaiBaseUrl?: string
    }

    // 验证必要参数
    if (!openaiApiKey) {
      return NextResponse.json(
        { message: "OpenAI API密钥未提供。请在应用设置中配置有效的API密钥。" },
        { status: 400 }
      )
    }

    // 获取可用模型列表
    const models = await getAvailableModels(
      openaiApiKey, 
      openaiBaseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    )

    // 返回模型列表
    return NextResponse.json({ models })
  } catch (error: any) {
    console.error("Error fetching models:", error)
    return NextResponse.json(
      { message: `获取模型列表时出错: ${error?.message || "未知错误"}` },
      { status: 500 }
    )
  }
}