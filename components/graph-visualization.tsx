"use client"

import React, { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize, Minimize, AlertCircle, X, Copy, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import dynamic from "next/dynamic"
import { NODE_COLORS, LINK_COLORS } from "@/lib/constants"

// 强制类型导入但不进行SSR
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

// 定义节点类型
interface Node {
  id: string;
  label: string;
  properties?: Record<string, any>;
  [key: string]: any;
}

// 定义链接类型
interface Link {
  source: string | Node;
  target: string | Node;
  label?: string;
  [key: string]: any;
}

// 定义处理后的节点
interface ProcessedNode extends Node {
  val: number;
  desc: string;
  color: string;
  labelVisible: boolean;
}

// 定义处理后的链接
interface ProcessedLink extends Omit<Link, "source" | "target"> {
  source: string | ProcessedNode;
  target: string | ProcessedNode;
  color: string;
}

// 图数据类型
interface GraphData {
  nodes: Node[];
  links: Link[];
}

// 处理后的图数据类型
interface ProcessedGraphData {
  nodes: ProcessedNode[];
  links: ProcessedLink[];
}

interface GraphVisualizationProps {
  data: GraphData;
}

export default function GraphVisualization({ data }: GraphVisualizationProps) {
  const [nodeInfo, setNodeInfo] = useState<ProcessedNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<ProcessedNode | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [fullscreen, setFullscreen] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [processedData, setProcessedData] = useState<ProcessedGraphData>({ nodes: [], links: [] })
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 处理和验证图数据
  useEffect(() => {
    try {
      if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
        setError("无效的图形数据结构")
        setProcessedData({ nodes: [], links: [] })
        return
      }

      if (data.nodes.length === 0) {
        setError("图数据中没有找到节点")
        setProcessedData({ nodes: [], links: [] })
        return
      }

      // 创建数据副本以避免修改props
      const processedNodes: ProcessedNode[] = data.nodes.map(node => ({
        ...node,
        // 计算节点大小 - 根据连接数量或其他属性动态调整
        val: 1, // 默认值，将在下面根据连接数更新
        // 添加额外的显示属性
        desc: node.properties ? 
          Object.entries(node.properties)
               .filter(([key]) => key !== 'name')
               .map(([key, val]) => `${key}: ${val}`)
               .slice(0, 3)
               .join('\n') 
          : '',
        color: NODE_COLORS[node.label] || NODE_COLORS.DEFAULT,
        // 为了在节点周围显示标签
        labelVisible: true,
      }))

      // 处理链接
      let processedLinks: ProcessedLink[] = data.links.map(link => ({
        ...link,
        color: LINK_COLORS[link.label || ''] || LINK_COLORS.DEFAULT,
      })) as ProcessedLink[]

      // 验证链接 (引用非存在节点的链接)
      const nodeIds = new Set(processedNodes.map((node) => node.id))
      
      const getNodeId = (source: string | Node): string => {
        if (typeof source === "string") return source;
        return source.id || "";
      }
      
      const invalidLinks = processedLinks.filter(link => {
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);
        return !nodeIds.has(sourceId) || !nodeIds.has(targetId);
      });

      if (invalidLinks.length > 0) {
        console.warn("图数据中存在无效链接:", invalidLinks)
        // 过滤掉无效链接
        processedLinks = processedLinks.filter(link => {
          const sourceId = getNodeId(link.source);
          const targetId = getNodeId(link.target);
          return nodeIds.has(sourceId) && nodeIds.has(targetId);
        });
      }

      // 根据连接数计算节点大小
      const nodeConnectionCount: Record<string, number> = {}
      
      // 统计每个节点的连接数
      processedLinks.forEach(link => {
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);
        
        nodeConnectionCount[sourceId] = (nodeConnectionCount[sourceId] || 0) + 1
        nodeConnectionCount[targetId] = (nodeConnectionCount[targetId] || 0) + 1
      })
      
      // 更新节点大小
      processedNodes.forEach(node => {
        const connections = nodeConnectionCount[node.id] || 0
        // 根据连接数设置节点大小，但有最小和最大值限制
        node.val = Math.max(1, Math.min(3, 1 + connections * 0.2))
      })

      setProcessedData({
        nodes: processedNodes,
        links: processedLinks,
      })
      setError(null)
    } catch (err) {
      console.error("处理图数据时出错:", err)
      setError("处理图数据时出错")
      setProcessedData({ nodes: [], links: [] })
    }
  }, [data])

  const handleNodeClick = (node: ProcessedNode) => {
    setNodeInfo(node)
  }

  const handleZoomIn = () => {
    if (graphRef.current) {
      const newZoom = zoomLevel * 1.2
      setZoomLevel(newZoom)
      graphRef.current.zoom(newZoom)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current) {
      const newZoom = zoomLevel * 0.8
      setZoomLevel(newZoom)
      graphRef.current.zoom(newZoom)
    }
  }

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!fullscreen) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen()
        }
      }
      setFullscreen(!fullscreen)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // 处理调整大小以更新图形尺寸
  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current && containerRef.current) {
        graphRef.current.width(containerRef.current.clientWidth)
        graphRef.current.height(containerRef.current.clientHeight - 40) // 减去控件高度
      }
    }

    window.addEventListener("resize", handleResize)
    handleResize() // 初始调整
    
    // 组件卸载时清理
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // 自定义节点渲染函数
  const nodeCanvasObject = (node: ProcessedNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const { x, y, id, label, color, val, properties } = node
    const size = val * 6 / globalScale
    const fontSize = 12 / globalScale
    const isHovered = hoveredNode === node
    
    // 绘制节点
    ctx.beginPath()
    ctx.arc(x!, y!, size, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
    
    // 如果节点被悬停，绘制边框
    if (isHovered) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()
    }
    
    // 优先显示name属性作为标签，其次使用label或id
    const displayName = properties?.name || label || id
    
    // 始终显示节点标签，无论缩放级别如何
    ctx.font = `${fontSize}px Sans-Serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // 绘制背景使文字更清晰
    const textWidth = ctx.measureText(displayName).width
    const bgHeight = fontSize * 1.2
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillRect(x! - textWidth / 2 - 2, y! + size + 2, textWidth + 4, bgHeight)
    
    // 绘制文字
    ctx.fillStyle = '#333333'
    ctx.fillText(displayName, x!, y! + size + 2 + bgHeight / 2)
  }
  
  // 链接标签渲染函数 - 增强版，显示关系类型和属性
  const linkCanvasObject = (link: ProcessedLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!link.source || !link.target) return;
    
    const source = typeof link.source === 'object' ? link.source : null;
    const target = typeof link.target === 'object' ? link.target : null;
    if (!source || !target) return;
    
    // 绘制关系线条，使用更鲜明的颜色
    const start = { x: source.x!, y: source.y! };
    const end = { x: target.x!, y: target.y! };
    
    // 计算方向向量
    const vx = end.x - start.x;
    const vy = end.y - start.y;
    const len = Math.sqrt(vx * vx + vy * vy);
    
    // 单位向量
    const uvx = vx / len;
    const uvy = vy / len;
    
    // 源节点和目标节点的半径
    const sourceSize = (source.val || 1) * 6 / globalScale;
    const targetSize = (target.val || 1) * 6 / globalScale;
    
    // 调整起点和终点，避免与节点重叠
    const adjustedStart = {
      x: start.x + uvx * sourceSize,
      y: start.y + uvy * sourceSize
    };
    
    const adjustedEnd = {
      x: end.x - uvx * targetSize,
      y: end.y - uvy * targetSize
    };
    
    // 绘制线条，使用更鲜明的颜色和更粗的线条
    ctx.beginPath();
    ctx.moveTo(adjustedStart.x, adjustedStart.y);
    ctx.lineTo(adjustedEnd.x, adjustedEnd.y);
    ctx.strokeStyle = link.color || '#666666';
    ctx.lineWidth = 2.5 / globalScale; // 增加线条粗细
    ctx.stroke();
    
    // 如果没有标签，不显示文本
    if (!link.label) return;
    
    // 增大字体大小，确保在各种缩放级别下都清晰可见
    const fontSize = 14 / globalScale;
    ctx.font = `bold ${fontSize}px Sans-Serif`;
    
    // 计算链接中点
    const midX = start.x + (end.x - start.x) / 2;
    const midY = start.y + (end.y - start.y) / 2;
    
    // 准备显示的文本 - 包括关系类型和属性
    let displayText = link.label;
    
    // 如果有关系属性，添加到显示文本中
    if (link.properties && Object.keys(link.properties).length > 0) {
      // 选择最多两个重要属性显示
      const propsToShow = Object.entries(link.properties)
        .slice(0, 2)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
      
      if (propsToShow) {
        displayText += `\n${propsToShow}`;
      }
    }
    
    // 测量文本宽度
    const lines = displayText.split('\n');
    const lineWidths = lines.map(line => ctx.measureText(line).width);
    const maxWidth = Math.max(...lineWidths);
    const lineHeight = fontSize * 1.2;
    const totalHeight = lineHeight * lines.length;
    
    // 绘制标签背景，使用半透明的关系颜色作为背景
    const bgColor = link.color || '#666666';
    // 创建带有透明度的背景色
    const rgbaMatch = bgColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    let bgFillStyle = 'rgba(255, 255, 255, 0.9)';
    
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 16);
      const g = parseInt(rgbaMatch[2], 16);
      const b = parseInt(rgbaMatch[3], 16);
      bgFillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`; // 使用关系颜色的半透明版本
    }
    
    // 绘制背景
    ctx.fillStyle = bgFillStyle;
    ctx.fillRect(
      midX - maxWidth / 2 - 6, 
      midY - totalHeight / 2 - 4, 
      maxWidth + 12, 
      totalHeight + 8
    );
    
    // 添加背景边框，使标签更加醒目
    ctx.strokeStyle = link.color || '#666666';
    ctx.lineWidth = 2 / globalScale;
    ctx.strokeRect(
      midX - maxWidth / 2 - 6, 
      midY - totalHeight / 2 - 4, 
      maxWidth + 12, 
      totalHeight + 8
    );
    
    // 绘制文本
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000'; // 使用黑色文字，增强可读性
    
    // 逐行绘制文本
    lines.forEach((line, i) => {
      const y = midY - (totalHeight / 2) + (i + 0.5) * lineHeight;
      ctx.fillText(line, midX, y);
    });
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      <div className="flex justify-between mb-2 shrink-0">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          {/* 节点类型图例 */}
          <div className="hidden sm:flex items-center ml-4 space-x-2 text-xs">
            {Object.entries(NODE_COLORS)
              .filter(([key]) => key !== 'DEFAULT')
              .filter(([_, color], index) => index < 40) // 限制显示的图例数量
              .map(([label, color]) => (
                <div key={label} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-1"
                    style={{ backgroundColor: color }}
                  />
                  <span>{label}</span>
                </div>
              ))
            }
            {Object.entries(NODE_COLORS).length > 5 && 
              <span className="text-muted-foreground">...</span>
            }
          </div>
        </div>
        
        <Button variant="outline" size="sm" onClick={toggleFullscreen}>
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        <div className="flex-1 bg-muted/50 rounded-md overflow-hidden">
          {processedData.nodes.length > 0 ? (
            <ForceGraph2D
              ref={graphRef}
              graphData={processedData as any}
              nodeRelSize={6}
              linkDirectionalArrowLength={6}  // 增大箭头长度
              linkDirectionalArrowRelPos={1}
              linkDirectionalArrowColor={(link) => link.color || LINK_COLORS.DEFAULT} // 箭头颜色与线条一致
              linkCurvature={0.25}
              linkWidth={(link) => {
                // 增强关系线条粗细
                if (typeof link.source === 'object' && typeof link.target === 'object' && 
                   (link.source.id === (nodeInfo?.id || '') || 
                    link.target.id === (nodeInfo?.id || ''))) {
                  return 4; // 选中节点的关系线更粗
                }
                return 2.5; // 默认关系线也增粗
              }}
              linkColor={(link) => link.color || LINK_COLORS.DEFAULT}
              nodeColor={(node) => node.color || NODE_COLORS.DEFAULT}
              onNodeClick={handleNodeClick as any}
              onNodeHover={setHoveredNode as any}
              nodeCanvasObject={nodeCanvasObject as any}
              linkCanvasObject={linkCanvasObject as any}
              linkCanvasObjectMode={() => "replace"}
              linkDirectionalParticles={3}  // 增加粒子数量
              linkDirectionalParticleWidth={(link) => {
                // 增强粒子效果
                if (typeof link.source === 'object' && typeof link.target === 'object' && 
                   (link.source.id === (nodeInfo?.id || '') || 
                    link.target.id === (nodeInfo?.id || ''))) {
                  return 5; // 选中节点的关系粒子更大
                }
                return 3; // 默认关系粒子也增大
              }}
              linkDirectionalParticleSpeed={0.006}  // 稍微加快粒子速度
              linkDirectionalParticleColor={(link) => link.color || LINK_COLORS.DEFAULT}  // 粒子颜色与线条一致
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              warmupTicks={100}
              onEngineStop={() => {
                // 初始化完成后，自适应缩放以显示整个图
                if (graphRef.current) {
                  // 调整缩放参数，确保能看到关系标签
                  graphRef.current.zoomToFit(400, 30);
                  // 确保缩放级别不小于0.2，以保证关系标签可见
                  setTimeout(() => {
                    const currentZoom = graphRef.current.zoom();
                    if (currentZoom < 0.2) {
                      graphRef.current.zoom(0.2);
                      setZoomLevel(0.2);
                    } else {
                      setZoomLevel(currentZoom);
                    }
                  }, 500);
                }
              }}
              width={containerRef.current?.clientWidth || 500}
              height={(containerRef.current?.clientHeight || 500) - 40}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">无图数据显示</p>
            </div>
          )}
        </div>

        {nodeInfo && (
          <Card className="w-72 shrink-0 overflow-auto min-h-0 max-h-full">
            <div className="p-3 border-b flex justify-between items-center">
              <div className="flex items-center">
                <h3 className="font-medium">
                  {nodeInfo.properties?.name || nodeInfo.label || "节点"}
                </h3>
                <Badge 
                  variant="outline" 
                  className="ml-2" 
                  style={{ 
                    backgroundColor: `${nodeInfo.color}33` as string, 
                    borderColor: nodeInfo.color as string,
                    color: nodeInfo.color as string 
                  }}
                >
                  {nodeInfo.label}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0" 
                onClick={() => setNodeInfo(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="p-4">
              <div className="text-sm font-medium mb-3 pb-1 border-b">ID: {nodeInfo.id}</div>
              
              {/* 节点关系信息 */}
              <div className="mt-3">
                <h4 className="text-sm font-medium mb-1">连接关系:</h4>
                <div className="bg-muted/50 rounded-md p-2 text-sm">
                  {processedData.links.filter((link) => {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    return sourceId === nodeInfo.id || targetId === nodeInfo.id;
                  }).length > 0 ? (
                    <div className="space-y-2">
                      {processedData.links.filter((link) => {
                        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                        return sourceId === nodeInfo.id || targetId === nodeInfo.id;
                      }).map((link, idx) => {
                        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                        const isOutgoing = sourceId === nodeInfo.id;
                        const relatedNodeId = isOutgoing ? targetId : sourceId;
                        const relatedNode = processedData.nodes.find(n => n.id === relatedNodeId);
                        const relatedNodeName = relatedNode?.properties?.name || relatedNode?.label || relatedNodeId;
                        
                        return (
                          <div key={idx} className="border-b border-muted-foreground/20 last:border-0 pb-2 last:pb-0">
                            <div className="flex items-center gap-1 mb-1">
                              <span style={{ color: link.color }} className="font-medium">
                                {isOutgoing ? '→' : '←'} {link.label || '关系'}
                              </span>
                            </div>
                            <div className="pl-3 text-xs text-muted-foreground break-words">
                              <span className="font-medium">{isOutgoing ? '指向' : '来自'}: </span>
                              <span>{relatedNodeName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">无连接关系</p>
                  )}
                </div>
              </div>
              
              {/* 节点属性信息 */}
              <div className="mt-3">
                <h4 className="text-sm font-medium mb-1">属性信息:</h4>
                {nodeInfo.properties && Object.keys(nodeInfo.properties).length > 0 ? (
                  <div className="bg-muted/50 rounded-md p-2 text-sm space-y-2">
                    {Object.entries(nodeInfo.properties).map(([key, value]) => {
                      // 将值转换为字符串并检查长度
                      const strValue = String(value);
                      const isLongValue = strValue.length > 100;
                      
                      return (
                        <div key={key} className="border-b border-muted-foreground/20 last:border-0 pb-2 last:pb-0">
                          <div className="font-medium text-muted-foreground mb-1">{key}:</div>
                          {isLongValue ? (
                            <CollapsibleContent propertyValue={strValue} />
                          ) : (
                            <div className="break-words">{strValue}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">无属性信息</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// 在文件末尾，组件结束前添加可折叠内容组件
function CollapsibleContent({ propertyValue }: { propertyValue: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // 显示预览（前80个字符加省略号）或完整内容
  const displayText = isExpanded 
    ? propertyValue 
    : propertyValue.substring(0, 80) + "...";

  // 复制到剪贴板
  const handleCopy = () => {
    navigator.clipboard.writeText(propertyValue);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  return (
    <div>
      <div className="break-words whitespace-pre-wrap mb-1">{displayText}</div>
      <div className="flex space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 text-xs px-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '收起' : '展开全部'}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 text-xs px-2"
          onClick={handleCopy}
        >
          {isCopied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {isCopied ? '已复制' : '复制'}
        </Button>
      </div>
    </div>
  );
}

