"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface DatabaseSchemaProps {
  neo4jUri?: string
  neo4jUsername?: string
  neo4jPassword?: string
}

interface SchemaData {
  nodeLabels: string[]
  relationshipTypes: string[]
  nodeProperties: Record<string, string[]>
}

export default function DatabaseSchema({ neo4jUri, neo4jUsername, neo4jPassword }: DatabaseSchemaProps) {
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSchemaData = async () => {
    if (!neo4jUri || !neo4jUsername || !neo4jPassword) {
      setError("请在应用设置中配置Neo4j数据库连接参数")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 构建URL参数
      const params = new URLSearchParams()
      params.append("neo4jUri", neo4jUri)
      params.append("neo4jUsername", neo4jUsername)
      params.append("neo4jPassword", neo4jPassword)

      // 调用API获取数据库结构信息
      const response = await fetch(`/api/schema?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `服务器返回状态码: ${response.status}`)
      }

      const data = await response.json()
      setSchemaData(data)
    } catch (error) {
      console.error("获取数据库结构信息失败:", error)
      setError(`获取数据库结构信息失败: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (neo4jUri && neo4jUsername && neo4jPassword) {
      fetchSchemaData()
    }
  }, [neo4jUri, neo4jUsername, neo4jPassword])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>数据库结构信息</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">正在获取数据库结构信息...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!schemaData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>数据库结构信息</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">请在应用设置中配置Neo4j数据库连接参数，然后刷新页面。</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neo4j数据库结构信息</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="nodeLabels">
          <TabsList className="mb-4">
            <TabsTrigger value="nodeLabels">节点标签</TabsTrigger>
            <TabsTrigger value="relationshipTypes">关系类型</TabsTrigger>
            <TabsTrigger value="nodeProperties">节点属性</TabsTrigger>
          </TabsList>
          
          <TabsContent value="nodeLabels">
            <div className="bg-muted/50 p-4 rounded-md">
              <h3 className="text-lg font-medium mb-2">节点标签 ({schemaData.nodeLabels.length})</h3>
              <div className="flex flex-wrap gap-2">
                {schemaData.nodeLabels.length > 0 ? (
                  schemaData.nodeLabels.map((label) => (
                    <Badge key={label} variant="outline" className="text-sm">
                      {label}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground">未找到节点标签</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="relationshipTypes">
            <div className="bg-muted/50 p-4 rounded-md">
              <h3 className="text-lg font-medium mb-2">关系类型 ({schemaData.relationshipTypes.length})</h3>
              <div className="flex flex-wrap gap-2">
                {schemaData.relationshipTypes.length > 0 ? (
                  schemaData.relationshipTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-sm">
                      {type}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground">未找到关系类型</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="nodeProperties">
            <div className="bg-muted/50 p-4 rounded-md">
              <h3 className="text-lg font-medium mb-2">节点属性</h3>
              {Object.keys(schemaData.nodeProperties).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(schemaData.nodeProperties).map(([label, properties]) => (
                    <div key={label} className="border border-border p-3 rounded-md">
                      <h4 className="font-medium mb-2">{label}</h4>
                      <div className="flex flex-wrap gap-2">
                        {properties.length > 0 ? (
                          properties.map((prop) => (
                            <Badge key={`${label}-${prop}`} variant="secondary" className="text-xs">
                              {prop}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">无属性</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">未找到节点属性</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}