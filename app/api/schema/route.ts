import { NextResponse } from "next/server"
import { getGraphSchema, getNodeProperties } from "@/lib/neo4j"

/**
 * API路由：获取Neo4j数据库的结构信息
 * 返回节点标签、关系类型和节点属性
 */
export async function GET(request: Request) {
  try {
    // 从URL参数中获取Neo4j连接信息
    const url = new URL(request.url)
    const neo4jUri = url.searchParams.get("neo4jUri")
    const neo4jUsername = url.searchParams.get("neo4jUsername")
    const neo4jPassword = url.searchParams.get("neo4jPassword")

    // 验证必要的参数
    if (!neo4jUri || !neo4jUsername || !neo4jPassword) {
      return NextResponse.json(
        { error: "Neo4j数据库连接参数不完整。请提供数据库URI、用户名和密码。" },
        { status: 400 }
      )
    }

    // 创建Neo4j配置
    const neo4jConfig = {
      uri: neo4jUri,
      username: neo4jUsername,
      password: neo4jPassword,
    }

    // 获取数据库结构信息
    const schemaResult = await getGraphSchema(neo4jConfig)
    const propertiesResult = await getNodeProperties(neo4jConfig)

    // 返回结构化的数据库信息
    return NextResponse.json({
      nodeLabels: schemaResult.nodeLabels,
      relationshipTypes: schemaResult.relationshipTypes,
      nodeProperties: propertiesResult,
    })
  } catch (error) {
    console.error("获取数据库结构信息时出错:", error)
    return NextResponse.json(
      { error: `获取数据库结构信息失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}