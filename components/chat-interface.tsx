"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Message } from "@/lib/types"
import { Loader2, Settings } from "lucide-react"

// 在消息渲染部分添加 Markdown 渲染支持
import ReactMarkdown from 'react-markdown'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  isLoading: boolean
  onOpenSettings?: () => void
}

export default function ChatInterface({ messages, onSendMessage, isLoading, onOpenSettings }: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input)
      setInput("")
    }
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/50 rounded-md mb-4">
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.role === "system"
                      ? "bg-muted text-muted-foreground"
                      : "bg-secondary text-secondary-foreground"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="bg-muted p-3 rounded-lg">
                    {message.content.includes("Error:") || message.content.includes("处理您的问题时遇到错误") ? (
                      <div>
                        <p className="font-semibold text-destructive mb-2">查询处理出错</p>
                        <p className="whitespace-pre-wrap mb-2">{message.content}</p>
                        {message.content.includes("Graph data processed:") && (
                          <div className="mt-2 p-2 border border-muted-foreground/20 rounded-md">
                            <p className="text-sm font-medium">已返回默认查询结果：</p>
                            <div className="prose dark:prose-invert max-w-none">
                              <ReactMarkdown>
                                {message.content.split("Graph data processed:")[1]}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>
                        {/* 检查消息内容是否包含表格数据（以 | 开头的行） */}
                        {message.content.includes("| ") && message.content.includes(" |") && (
                          <div className="mt-4 overflow-x-auto">
                            <div className="inline-block min-w-full align-middle">
                              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700 border border-gray-300 dark:border-gray-700">
                                <thead>
                                  {message.content.split("\n").filter(line => line.trim().startsWith("|")).map((line, i) => {
                                    if (i === 0) {
                                      const cells = line.split("|").filter(cell => cell.trim() !== "").map(cell => cell.trim());
                                      return (
                                        <tr key={i} className="bg-gray-100 dark:bg-gray-800">
                                          {cells.map((cell, j) => (
                                            <th key={j} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{cell}</th>
                                          ))}
                                        </tr>
                                      );
                                    }
                                    return null;
                                  })}
                                </thead>
                                <tbody>
                                  {message.content.split("\n").filter(line => line.trim().startsWith("|")).map((line, i) => {
                                    if (i === 0) return null; // 跳过表头行，已在thead中处理
                                    
                                    const cells = line.split("|").filter(cell => cell.trim() !== "").map(cell => cell.trim());
                                    return (
                                      <tr key={i} className={i === 1 ? "border-t border-b border-gray-300 dark:border-gray-700" : "border-b border-gray-200 dark:border-gray-800"}>
                                        {cells.map((cell, j) => {
                                          if (i === 1 && cell.includes("---")) {
                                            return <td key={j} className="px-3 py-0"></td>;
                                          } else {
                                            return <td key={j} className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{cell}</td>;
                                          }
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-center">请输入您的问题开始对话...</p>
          </div>
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-secondary text-secondary-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex space-x-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="询问图数据库相关问题..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "发送"}
        </Button>
        {onOpenSettings && (
          <Button type="button" variant="outline" size="icon" onClick={onOpenSettings} title="应用设置">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  )
}

