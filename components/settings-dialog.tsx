"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SettingsDialogProps {
  openaiApiKey: string
  openaiBaseUrl: string
  modelName?: string  // 添加模型名称属性
  neo4jUri: string
  neo4jUsername: string
  neo4jPassword: string

  onSave: (settings: {
    openaiApiKey: string
    openaiBaseUrl: string
    modelName?: string  // 添加模型名称属性
    neo4jUri: string
    neo4jUsername: string
    neo4jPassword: string
    
  }) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({
  openaiApiKey,
  openaiBaseUrl,
  modelName,  // 添加默认值
  neo4jUri,
  neo4jUsername,
  neo4jPassword,
  onSave,
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState(openaiApiKey)
  const [baseUrl, setBaseUrl] = useState(openaiBaseUrl)
  const [dbUri, setDbUri] = useState(neo4jUri)
  const [dbUsername, setDbUsername] = useState(neo4jUsername)
  const [dbPassword, setDbPassword] = useState(neo4jPassword)
  const [selectedModel, setSelectedModel] = useState(modelName)  // 添加模型状态
  const [activeTab, setActiveTab] = useState("openai")
  const [error, setError] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // 更新本地状态当props变化时
  useEffect(() => {
    if (open) {
      setApiKey(openaiApiKey)
      setBaseUrl(openaiBaseUrl)
      setDbUri(neo4jUri)
      setDbUsername(neo4jUsername)
      setDbPassword(neo4jPassword)
      setSelectedModel(modelName)
      setError(null)
    }
  }, [open, openaiApiKey, openaiBaseUrl, neo4jUri, neo4jUsername, neo4jPassword, modelName])

  // 当API密钥或基础URL变化时获取模型列表
  useEffect(() => {
    async function loadModels() {
      if (!apiKey) {
        setAvailableModels([]);
        return;
      }

      setIsLoadingModels(true);

      try {
        const response = await fetch('/api/models', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            openaiApiKey: apiKey,
            openaiBaseUrl: baseUrl,
          }),
        });

        if (!response.ok) {
          throw new Error('获取模型列表失败');
        }

        const data = await response.json();
        setAvailableModels(data.models || []);
      } catch (error) {
        console.error('获取模型列表时出错:', error);
      } finally {
        setIsLoadingModels(false);
      }
    }

    if (apiKey) {
      loadModels();
    }
  }, [apiKey, baseUrl]);

  const handleSave = () => {
    // 验证必填字段
    if (!apiKey || !apiKey.trim()) {
      setError("OpenAI API密钥是必填项")
      setActiveTab("openai")
      return
    }

    if (!dbUri || !dbUri.trim()) {
      setError("Neo4j数据库地址是必填项")
      setActiveTab("neo4j")
      return
    }

    if (!dbUsername || !dbUsername.trim()) {
      setError("Neo4j用户名是必填项")
      setActiveTab("neo4j")
      return
    }

    if (!dbPassword || !dbPassword.trim()) {
      setError("Neo4j密码是必填项")
      setActiveTab("neo4j")
      return
    }

    // Reset error
    setError(null)

    // 记录保存的设置用于调试
    console.log("Saving settings:", {
      openaiApiKey: apiKey,
      openaiBaseUrl: baseUrl,
      neo4jUri: dbUri,
      neo4jUsername: dbUsername,
      neo4jPassword: dbPassword ? "********" : "",
      modelName: selectedModel,
    })

    onSave({
      openaiApiKey: apiKey,
      openaiBaseUrl: baseUrl,
      neo4jUri: dbUri,
      neo4jUsername: dbUsername,
      neo4jPassword: dbPassword,
      modelName: selectedModel, // 添加模型名称
    })

    // 显示成功提示
    toast({
      title: "设置已保存",
      description: "您的设置已成功保存",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>应用设置</DialogTitle>
          <DialogDescription>配置OpenAI和Neo4j数据库连接参数。应用需要这些参数才能正常工作。</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="openai">OpenAI 设置</TabsTrigger>
            <TabsTrigger value="neo4j">Neo4j 设置</TabsTrigger>
          </TabsList>

          <TabsContent value="openai" className="mt-4">
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="apiKey" className="text-right">
                  API Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="您的OpenAI API Key"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="baseUrl" className="text-right">
                  Base URL
                </Label>
                <Input
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="col-span-3"
                />
              </div>
              
              {/* 添加模型选择下拉框 */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="modelName" className="text-right">
                  模型
                </Label>
                <div className="col-span-3">
                  <select
                    id="modelName"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">选择模型或输入自定义模型</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  {isLoadingModels && (
                    <div className="text-xs text-muted-foreground mt-1">正在加载模型列表...</div>
                  )}
                  {!isLoadingModels && availableModels.length === 0 && apiKey && (
                    <div className="text-xs text-muted-foreground mt-1">未找到可用模型或API密钥无效</div>
                  )}
                </div>
              </div>
              
              {/* 允许用户输入自定义模型名称 */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customModel" className="text-right">
                  自定义模型
                </Label>
                <Input
                  id="customModel"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  placeholder="例如: gpt-4, gpt-3.5-turbo"
                  className="col-span-3"
                />
              </div>
              
              <div className="text-sm text-muted-foreground mt-2">
                <p>OpenAI API密钥用于生成数据库查询。如果您没有API密钥，可以从<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI网站</a>获取。</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="neo4j" className="mt-4">
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dbUri" className="text-right">
                  数据库地址 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dbUri"
                  value={dbUri}
                  onChange={(e) => setDbUri(e.target.value)}
                  placeholder="neo4j://localhost:7687"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dbUsername" className="text-right">
                  用户名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dbUsername"
                  value={dbUsername}
                  onChange={(e) => setDbUsername(e.target.value)}
                  placeholder="neo4j"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dbPassword" className="text-right">
                  密码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dbPassword"
                  type="password"
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  placeholder="数据库密码"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                <p>Neo4j数据库连接参数用于查询和可视化图数据。所有字段都是必填的。</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="submit" onClick={handleSave}>
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

