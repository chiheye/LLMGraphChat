"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import DatabaseSchema from "@/components/database-schema"
import { SettingsDialog } from "@/components/settings-dialog"

export default function SchemaPage() {
  const [neo4jUri, setNeo4jUri] = useState<string>("") 
  const [neo4jUsername, setNeo4jUsername] = useState<string>("") 
  const [neo4jPassword, setNeo4jPassword] = useState<string>("") 
  const [openaiApiKey, setOpenaiApiKey] = useState<string>("") 
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState<string>("") 
  const [modelName, setModelName] = useState<string>("") 
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)

  // 从localStorage加载设置
  useEffect(() => {
    const savedNeo4jUri = localStorage.getItem("neo4jUri") || ""
    const savedNeo4jUsername = localStorage.getItem("neo4jUsername") || ""
    const savedNeo4jPassword = localStorage.getItem("neo4jPassword") || ""
    const savedApiKey = localStorage.getItem("openaiApiKey") || ""
    const savedBaseUrl = localStorage.getItem("openaiBaseUrl") || ""
    const savedModelName = localStorage.getItem("modelName") || ""

    setNeo4jUri(savedNeo4jUri)
    setNeo4jUsername(savedNeo4jUsername)
    setNeo4jPassword(savedNeo4jPassword)
    setOpenaiApiKey(savedApiKey)
    setOpenaiBaseUrl(savedBaseUrl)
    setModelName(savedModelName)
  }, [])

  const handleSaveSettings = (settings: any) => {
    setNeo4jUri(settings.neo4jUri)
    setNeo4jUsername(settings.neo4jUsername)
    setNeo4jPassword(settings.neo4jPassword)
    setOpenaiApiKey(settings.openaiApiKey)
    setOpenaiBaseUrl(settings.openaiBaseUrl)
    if (settings.modelName) setModelName(settings.modelName)
    
    localStorage.setItem("neo4jUri", settings.neo4jUri)
    localStorage.setItem("neo4jUsername", settings.neo4jUsername)
    localStorage.setItem("neo4jPassword", settings.neo4jPassword)
    localStorage.setItem("openaiApiKey", settings.openaiApiKey)
    localStorage.setItem("openaiBaseUrl", settings.openaiBaseUrl)
    if (settings.modelName) localStorage.setItem("modelName", settings.modelName)

    setSettingsOpen(false)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Neo4j数据库结构信息</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/">返回主页</Link>
          </Button>
          <Button onClick={() => setSettingsOpen(true)}>
            配置数据库连接
          </Button>
        </div>
      </div>

      <DatabaseSchema 
        neo4jUri={neo4jUri}
        neo4jUsername={neo4jUsername}
        neo4jPassword={neo4jPassword}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={handleSaveSettings}
        openaiApiKey={openaiApiKey}
        openaiBaseUrl={openaiBaseUrl}
        neo4jUri={neo4jUri}
        neo4jUsername={neo4jUsername}
        neo4jPassword={neo4jPassword}
        modelName={modelName}
      />
    </div>
  )
}