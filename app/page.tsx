"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import ChatInterface from "@/components/chat-interface"
import GraphVisualization from "@/components/graph-visualization"
import { SettingsDialog } from "@/components/settings-dialog"
import { Toaster } from "@/components/ui/toaster"
import type { Message } from "@/lib/types"
import Link from "next/link"

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "欢迎使用LLMGraphChat！您可以用自然语言询问图数据库中的任何内容。",
    },
  ])
  const [graphData, setGraphData] = useState<any>(null)
  const [tableData, setTableData] = useState<any>(null) // 添加表格数据状态
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)

  // OpenAI settings
  const [openaiApiKey, setOpenaiApiKey] = useState<string>("")
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState<string>("")
  // 添加模型名称状态
  const [modelName, setModelName] = useState<string>("")

  // Neo4j settings
  const [neo4jUri, setNeo4jUri] = useState<string>("")
  const [neo4jUsername, setNeo4jUsername] = useState<string>("")
  const [neo4jPassword, setNeo4jPassword] = useState<string>("")

  // Load settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedApiKey = localStorage.getItem("openaiApiKey") || ""
      const savedBaseUrl = localStorage.getItem("openaiBaseUrl") || ""
      const savedNeo4jUri = localStorage.getItem("neo4jUri") || ""
      const savedNeo4jUsername = localStorage.getItem("neo4jUsername") || ""
      const savedNeo4jPassword = localStorage.getItem("neo4jPassword") || ""
      const savedModelName = localStorage.getItem("modelName") || "" // 加载模型名称

      console.log("Loading settings from localStorage:", {
        openaiApiKey: savedApiKey ? "********" : "",
        openaiBaseUrl: savedBaseUrl,
        neo4jUri: savedNeo4jUri,
        neo4jUsername: savedNeo4jUsername,
        neo4jPassword: savedNeo4jPassword ? "********" : "",
        modelName: savedModelName, // 记录模型名称
      })

      setOpenaiApiKey(savedApiKey)
      setOpenaiBaseUrl(savedBaseUrl)
      setNeo4jUri(savedNeo4jUri)
      setNeo4jUsername(savedNeo4jUsername)
      setNeo4jPassword(savedNeo4jPassword)
      setModelName(savedModelName) // 设置模型名称
    } catch (error) {
      console.error("Error loading settings from localStorage:", error)
    }
  }, [])

  const handleSaveSettings = (settings: {
    openaiApiKey: string
    openaiBaseUrl: string
    neo4jUri: string
    neo4jUsername: string
    neo4jPassword: string
    modelName?: string // 添加模型名称
  }) => {
    try {
      // 更新状态
      setOpenaiApiKey(settings.openaiApiKey)
      setOpenaiBaseUrl(settings.openaiBaseUrl)
      setNeo4jUri(settings.neo4jUri)
      setNeo4jUsername(settings.neo4jUsername)
      setNeo4jPassword(settings.neo4jPassword)
      if (settings.modelName) setModelName(settings.modelName) // 更新模型名称
  
      // 保存到 localStorage
      localStorage.setItem("openaiApiKey", settings.openaiApiKey)
      localStorage.setItem("openaiBaseUrl", settings.openaiBaseUrl)
      localStorage.setItem("neo4jUri", settings.neo4jUri)
      localStorage.setItem("neo4jUsername", settings.neo4jUsername)
      localStorage.setItem("neo4jPassword", settings.neo4jPassword)
      if (settings.modelName) localStorage.setItem("modelName", settings.modelName) // 保存模型名称

      console.log("Settings saved to localStorage")
      setSettingsOpen(false)
    } catch (error) {
      console.error("Error saving settings to localStorage:", error)
      setError("保存设置失败，请重试。")
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // Reset error state
    setError(null)
    
    // 验证必要的设置
    if (!openaiApiKey || !openaiApiKey.trim()) {
      setError("请在应用设置中提供有效的OpenAI API密钥")
      setSettingsOpen(true)
      return
    }
    
    if (!neo4jUri || !neo4jUri.trim() || !neo4jUsername || !neo4jUsername.trim() || !neo4jPassword || !neo4jPassword.trim()) {
      setError("请在应用设置中配置Neo4j数据库连接参数")
      setSettingsOpen(true)
      return
    }

    // Add user message to chat
    const userMessage: Message = { role: "user", content }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Prepare request body
      const requestBody: any = {
        messages: [...messages, userMessage],
      }

      // Add OpenAI settings if they exist
      if (openaiApiKey && openaiApiKey.trim()) {
        requestBody.openaiApiKey = openaiApiKey.trim()
      }

      if (openaiBaseUrl && openaiBaseUrl.trim()) {
        requestBody.openaiBaseUrl = openaiBaseUrl.trim()
      }
    
      // 添加模型名称
      if (modelName && modelName.trim()) {
        requestBody.modelName = modelName.trim()
      }

      // Add Neo4j settings if they exist
      if (neo4jUri && neo4jUri.trim()) {
        requestBody.neo4jUri = neo4jUri.trim()
      }

      if (neo4jUsername && neo4jUsername.trim()) {
        requestBody.neo4jUsername = neo4jUsername.trim()
      }

      if (neo4jPassword && neo4jPassword.trim()) {
        requestBody.neo4jPassword = neo4jPassword.trim()
      }

      console.log("Sending request with settings:", {
        hasOpenAIKey: !!requestBody.openaiApiKey,
        hasOpenAIBaseUrl: !!requestBody.openaiBaseUrl,
        hasNeo4jUri: !!requestBody.neo4jUri,
        hasNeo4jUsername: !!requestBody.neo4jUsername,
        hasNeo4jPassword: !!requestBody.neo4jPassword,
        modelName: modelName || "default", // 记录使用的模型
      })

      // Send message to API with settings
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        let errorMessage = `服务器返回状态码: ${response.status}`
        try {
          const errorData = await response.json()
          if (errorData && errorData.message) {
            errorMessage = errorData.message
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError)
        }
        throw new Error(errorMessage)
      }

      // 删除这里的嵌套 try 和重复的 tableData 声明
      const data = await response.json()
    
      // Add assistant message to chat
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }])
    
      // Update graph data if available
      if (data.graphData) {
        setGraphData(data.graphData)
        setTableData(null) // 清空表格数据
      } 
      // 更新表格数据（如果有）
      else if (data.tableData) {
        setTableData(data.tableData)
        setGraphData(null) // 清空图形数据
      }
    } catch (error: any) {
      console.error("Error sending message:", error)
      setError(error.message || "发生了未知错误")
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "抱歉，处理您的请求时出现了错误。请重试或检查您的数据库连接设置。",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

    return (
      <div className="container mx-auto p-4 h-screen overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">LLMGraphChat</h1>
              <p className="text-muted-foreground">使用自然语言查询图数据库</p>
            </div>

            {/* Make the settings button more prominent */}
            <Button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>应用设置</span>
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            {/* Left side: Graph Visualization */}
            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-lg">图形可视化</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-2 min-h-0 overflow-hidden">
                {graphData ? (
                  <GraphVisualization data={graphData} />
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted/50 rounded-md">
                    <p className="text-muted-foreground text-center p-4">提问以查看图形可视化</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right side: Chat Interface */}
            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-lg">对话</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-2 min-h-0 overflow-hidden">
                <ChatInterface
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground shrink-0">
            <div className="mb-2">由OpenAI和Neo4j提供支持</div>
            <Link href="/schema" className="text-primary hover:underline">查看数据库结构信息</Link>
          </div>
        </div>
        
        <SettingsDialog
          openaiApiKey={openaiApiKey}
          openaiBaseUrl={openaiBaseUrl}
          neo4jUri={neo4jUri}
          neo4jUsername={neo4jUsername}
          neo4jPassword={neo4jPassword}
          modelName={modelName} // 传递模型名称
          onSave={handleSaveSettings}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
        
        <Toaster />
      </div>
    )
  }

  // 添加格式化表格数据的函数
  function formatTableData(tableData: any) {
    if (!tableData || !tableData.columns || !tableData.rows || tableData.rows.length === 0) {
      return "没有查询结果";
    }
  
    // 创建表头
    let table = "| " + tableData.columns.join(" | ") + " |\n";
    table += "| " + tableData.columns.map(() => "---").join(" | ") + " |\n";
  
    // 添加表格内容
    tableData.rows.forEach((row: any) => {
      table += "| " + tableData.columns.map((col: string) => {
        const value = row[col];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
      }).join(" | ") + " |\n";
    });
  
    return table;
  }

  

