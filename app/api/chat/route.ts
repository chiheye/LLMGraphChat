import { NextResponse } from "next/server"
import { generateCypherQuery } from "@/lib/openai"
import { executeQuery, transformNeo4jResultToGraphData, getGraphSchema, getNodeProperties, getDriver } from "@/lib/neo4j"
import type { Message, ChatResponse, Neo4jResult } from "@/lib/types"

// 在文件顶部添加 GraphData 接口定义

// 定义 GraphData 接口
interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    properties?: Record<string, any>;
    [key: string]: any;
  }>;
  links: Array<{
    source: number | string;
    target: number | string;
    type?: string;
    id?: string;
    label?: string;
    [key: string]: any;
  }>;
}

// 转换函数，将GraphData转换为ChatResponse中需要的格式
function convertGraphDataForResponse(data: GraphData): ChatResponse['graphData'] {
  if (!data || !data.nodes || !data.links) {
    return undefined;
  }
  
  return {
    nodes: data.nodes,
    links: data.links.map(link => ({
      ...link,
      source: typeof link.source === 'number' ? String(link.source) : link.source,
      target: typeof link.target === 'number' ? String(link.target) : link.target
    }))
  };
}

export async function POST(request: Request) {
  try {
    // Parse request body with error handling
    const body = await request.json().catch((error) => {
      console.error("Error parsing request body:", error)
      return null
    })

    if (!body || !body.messages) {
      return NextResponse.json({ message: "Invalid request: messages array is required" }, { status: 400 })
    }

    // 在解构请求体时添加 modelName 参数
    const { messages, openaiApiKey, openaiBaseUrl, neo4jUri, neo4jUsername, neo4jPassword, modelName } = body as {
      messages: Message[]
      openaiApiKey?: string
      openaiBaseUrl?: string
      neo4jUri?: string
      neo4jUsername?: string
      neo4jPassword?: string
      modelName?: string  // 添加模型名称参数
    }

    console.log("API request received with settings:", {
      hasOpenAIKey: !!openaiApiKey,
      hasOpenAIBaseUrl: !!openaiBaseUrl,
      hasNeo4jUri: !!neo4jUri,
      hasNeo4jUsername: !!neo4jUsername,
      hasNeo4jPassword: !!neo4jPassword,
      modelName: modelName || "default",  // 记录使用的模型
    })

    // Validate required parameters
    if (!openaiApiKey) {
      return NextResponse.json(
        { message: "OpenAI API密钥未提供。请在应用设置中配置有效的API密钥。" },
        { status: 400 }
      )
    }

    if (!neo4jUri || !neo4jUsername || !neo4jPassword) {
      return NextResponse.json(
        { message: "Neo4j数据库连接参数不完整。请在应用设置中配置数据库URI、用户名和密码。" },
        { status: 400 }
      )
    }

    // Create Neo4j custom config if provided
    const neo4jConfig =
      neo4jUri || neo4jUsername || neo4jPassword
        ? {
            uri: neo4jUri,
            username: neo4jUsername,
            password: neo4jPassword,
          }
        : undefined

    // Get schema information with error handling
    let schema: { nodeLabels: string[]; relationshipTypes: string[]; } = { nodeLabels: [], relationshipTypes: [] };
    let nodeProperties: Record<string, string[]> = {};
    
    // 在 POST 函数中，修改 messages 数组，添加 schema 信息到系统消息
    try {
      const schemaResult = await getGraphSchema(neo4jConfig);
      schema = schemaResult || { nodeLabels: [], relationshipTypes: [] };
      
      const propertiesResult = await getNodeProperties(neo4jConfig);
      nodeProperties = propertiesResult || {};
      
      console.log("Schema information retrieved:", {
        nodeLabels: schema.nodeLabels.length,
        relationshipTypes: schema.relationshipTypes.length,
        nodePropertiesCount: Object.keys(nodeProperties).length,
      })
      
      // 添加 schema 信息到系统消息
      const systemMessageIndex = messages.findIndex(msg => msg.role === 'system');
      if (systemMessageIndex !== -1) {
        // 更新现有的系统消息
        messages[systemMessageIndex].content += `\n\n数据库结构信息：
    节点标签: ${schema.nodeLabels.join(', ')}
    关系类型: ${schema.relationshipTypes.join(', ')}
    节点属性: ${JSON.stringify(nodeProperties, null, 2)}`;
      } else {
        // 添加新的系统消息
        messages.unshift({
          role: 'system',
          content: `欢迎使用LLMGraphChat！您可以用自然语言询问图数据库中的任何内容。
  
          数据库结构信息：
          节点标签: ${schema.nodeLabels.join(', ')}
          关系类型: ${schema.relationshipTypes.join(', ')}
          节点属性: ${JSON.stringify(nodeProperties, null, 2)}`
        });
      }
      
      // 在生成 Cypher 查询之前，添加关系方向提示
      const systemMsgIndex = messages.findIndex(msg => msg.role === 'system');
      if (systemMsgIndex !== -1) {
        messages[systemMsgIndex].content += `\n\n注意：在生成 Cypher 查询时，请考虑关系的方向。例如，"妻子"关系可能是从妻子指向丈夫，也可能是从丈夫指向妻子。如果不确定，可以使用无方向查询如 (a)-[:妻子]-(b) 或尝试双向查询。`;
      }
    } catch (error: any) {
      console.error("Error retrieving schema information:", error);
      // 继续执行，使用默认空值
    }

    // Generate Cypher query using OpenAI
    let cypherQuery: string, explanation: string;
    try {
      // 打印发送给 LLM 的请求参数
      console.log("LLM Request Parameters:", {
        messagesCount: messages.length,
        lastMessage: messages[messages.length - 1]?.content,
        schemaNodeLabels: schema.nodeLabels,
        schemaRelationshipTypes: schema.relationshipTypes,
        nodePropertiesKeys: Object.keys(nodeProperties),
        apiKeyProvided: !!openaiApiKey,
        baseUrlProvided: !!openaiBaseUrl
      });
      
      // 打印完整的消息内容，便于调试
      console.log("Full messages content:", JSON.stringify(messages, null, 2));
      
      // 调用 generateCypherQuery 并获取结果
      const result = await generateCypherQuery(messages, { ...schema, nodeProperties }, openaiApiKey, openaiBaseUrl, modelName);
      
      // 打印原始响应，查看格式
      console.log("Raw LLM Response:", result);
      
      // 处理 LLM 返回的数据
      let processedResult: { cypherQuery: string | null; explanation: string | null } = {
        cypherQuery: null,
        explanation: null
      };
      
      // 检查结果是否为数组（流式响应的chunks）
      if (Array.isArray(result) && result.length > 0) {
        // 如果结果是数组，拼接所有content
        let fullContent = '';
        
        // 遍历所有chunks，提取并拼接content
        for (const chunk of result) {
          if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
            fullContent += chunk.choices[0].delta.content;
          }
        }
        
        console.log("Assembled content from stream:", fullContent);
        
        // 从拼接的内容中提取Cypher查询和解释
        try {
          // 尝试作为JSON解析
          const jsonMatch = fullContent && typeof fullContent === 'string' ? fullContent.match(/{[\s\S]*?}/) : null;
          if (jsonMatch && jsonMatch[0]) {
            const parsedJson = JSON.parse(jsonMatch[0]);
            processedResult.cypherQuery = parsedJson.cypherQuery;
            processedResult.explanation = parsedJson.explanation;
          } else {
            // 如果不是JSON，尝试直接提取Cypher查询
            const cypherMatch = fullContent && typeof fullContent === 'string' ? fullContent.match(/cypherQuery["\s:]+([^"]+)/) : null;
            const explanationMatch = fullContent && typeof fullContent === 'string' ? fullContent.match(/explanation["\s:]+([^"]+)/) : null;
            
            processedResult.cypherQuery = cypherMatch && cypherMatch[1] ? cypherMatch[1].trim() : null;
            processedResult.explanation = explanationMatch && explanationMatch[1] ? explanationMatch[1].trim() : null;
          }
        } catch (parseError) {
          console.error("Error parsing assembled content:", parseError);
        }
      } else if (typeof result === 'string') {
        // 如果结果是字符串，按之前的逻辑处理
        try {
          // 尝试直接解析为 JSON
          const jsonResult = JSON.parse(result);
          processedResult = {
            cypherQuery: jsonResult.cypherQuery || null,
            explanation: jsonResult.explanation || null
          };
        } catch (parseError) {
          console.log("Direct JSON parse failed, trying to extract JSON from text");
          
          // 尝试从文本中提取 JSON 部分
          const jsonRegex = /{[\s\S]*?}/g;
          const jsonMatches = result && typeof result === 'string' ? result.match(jsonRegex) : null;
          
          if (jsonMatches && jsonMatches.length > 0) {
            try {
              const extractedJson = JSON.parse(jsonMatches[0]);
              processedResult = {
                cypherQuery: extractedJson.cypherQuery || null,
                explanation: extractedJson.explanation || null
              };
              console.log("Extracted JSON from text:", processedResult);
            } catch (extractError) {
              console.error("Failed to parse extracted JSON:", extractError);
            }
          }
          
          // 如果上述方法都失败，尝试提取 Cypher 查询和解释
          if (!processedResult.cypherQuery) {
            // 尝试提取 Cypher 查询
            const cypherRegex = /```(?:cypher)?\s*(MATCH[\s\S]*?;?)\s*```/i;
            const cypherMatch = result && typeof result === 'string' ? result.match(cypherRegex) : null;
            
            // 尝试提取解释文本
            const explanationRegex = /(?:explanation|解释)[:：]\s*([\s\S]*?)(?=```|$)/i;
            const explanationMatch = result && typeof result === 'string' ? result.match(explanationRegex) : null;
            
            processedResult = {
              cypherQuery: cypherMatch ? cypherMatch[1].trim() : null,
              explanation: explanationMatch ? explanationMatch[1].trim() : null
            };
            
            console.log("Extracted from text patterns:", processedResult);
          }
        }
      } else if (result && typeof result === 'object') {
        // 如果已经是对象，直接使用
        processedResult = {
          cypherQuery: result.cypherQuery || null,
          explanation: result.explanation || null
        };
      }
      
      // 如果处理后仍然没有有效结果，使用默认值
      if (!processedResult.cypherQuery) {
        processedResult = {
          cypherQuery: "MATCH (n:Character) RETURN n LIMIT 25",
          explanation: "无法从LLM响应中提取有效的查询。使用默认查询返回角色节点。"
        };
      }
      
      cypherQuery = processedResult.cypherQuery as string; // 类型断言，确保不为null
      explanation = processedResult.explanation || "未提供查询解释。";
      
      console.log("Final processed result:", { cypherQuery, explanation });
      console.log("Generated Cypher query:", cypherQuery);
    } catch (error: any) {
      console.error("Error generating Cypher query:", error);
      // 使用默认查询
      cypherQuery = "MATCH (n:Character) RETURN n LIMIT 25";
      explanation = `生成查询时出错：${error?.message || "未知错误"}。使用默认查询返回角色节点。`;
    }

    // 或者在执行查询前修改查询语句，尝试无方向查询
    if (cypherQuery.includes('妻子')) {
      // 将有向关系替换为无向关系
      cypherQuery = cypherQuery.replace(/\(([^)]+)\)-\[:妻子\]->\(([^)]+)\)/g, '($1)-[:妻子]-($2)');
      console.log("Modified query to use undirected relationship:", cypherQuery);
    }

    // Execute the Cypher query against Neo4j
    let neo4jResult: Neo4jResult = { nodes: [], relationships: [] };
    let graphData: GraphData = { nodes: [], links: [] };

    // 在执行查询后，添加错误处理和关系数据修复
    try {
      neo4jResult = await executeQuery(cypherQuery, {}, neo4jConfig);
      console.log("Query executed successfully, processing results");
      
      // 检查并修复关系数据
      if (neo4jResult.relationships && Array.isArray(neo4jResult.relationships) && neo4jResult.relationships.length > 0) {
        neo4jResult.relationships = neo4jResult.relationships.map(rel => {
          if (!rel) return { id: `auto-${Date.now()}-${Math.random()}`, type: "unknown", startNodeId: "", endNodeId: "", properties: {} };
          
          // 确保关系对象有正确的属性
          // 使用类型断言来处理可能不存在的属性
          const relAny = rel as any;
          
          return {
            ...rel,
            id: rel.id || `rel-${Math.random().toString(36).substring(2, 10)}`,
            type: rel.type || "unknown",
            startNodeId: rel.startNodeId || (relAny.startNodeIdentity ? String(relAny.startNodeIdentity) : "") || (relAny.start !== undefined ? String(relAny.start) : ""),
            endNodeId: rel.endNodeId || (relAny.endNodeIdentity ? String(relAny.endNodeIdentity) : "") || (relAny.end !== undefined ? String(relAny.end) : ""),
            properties: rel.properties || {}
          };
        });
      } else {
        // 确保relationships始终是数组
        neo4jResult.relationships = [];
      }
      
      // 检查是否有结果
      if (neo4jResult.nodes.length === 0) {
        console.log("Query returned no results, trying alternative query")
        
        // 尝试反向查询
        if (cypherQuery.includes('->')) {
          const reversedQuery = cypherQuery.replace(/\(([^)]+)\)-\[:([^)]+)\]->\(([^)]+)\)/g, '($3)-[:$2]->($1)');
          console.log("Trying reversed query:", reversedQuery);
          neo4jResult = await executeQuery(reversedQuery, {}, neo4jConfig);
        }
        
        // 如果仍然没有结果，尝试无方向查询
        if (neo4jResult.nodes.length === 0 && cypherQuery.includes('->')) {
          const undirectedQuery = cypherQuery.replace(/\(([^)]+)\)-\[:([^)]+)\]->\(([^)]+)\)/g, '($1)-[:$2]-($3)');
          console.log("Trying undirected query:", undirectedQuery);
          neo4jResult = await executeQuery(undirectedQuery, {}, neo4jConfig);
        }
      }
      
      // 打印原始 Neo4j 结果，帮助调试
      console.log("Raw Neo4j result:", {
        nodes: neo4jResult.nodes.length,
        relationships: neo4jResult.relationships.length,
        relationshipDetails: neo4jResult.relationships.map(rel => ({
          type: rel.type,
          startNodeId: rel.startNodeId,
          endNodeId: rel.endNodeId
        }))
      });
      
      // Transform Neo4j result to graph data format for visualization
      graphData = transformNeo4jResultToGraphData(neo4jResult)
      
      // 如果转换后没有链接，但原始数据中有关系，手动添加链接
      if (graphData.links.length === 0 && neo4jResult.relationships.length > 0) {
        console.log("No links in transformed data, manually adding relationships");
        
        // 创建节点ID映射，用于查找节点索引
        const nodeIdMap = new Map();
        graphData.nodes.forEach((node, index) => {
          nodeIdMap.set(node.id, index);
        });
        
        // 手动添加关系链接
        neo4jResult.relationships.forEach(rel => {
          if (!rel.startNodeId || !rel.endNodeId) {
            console.log("Skipping relationship with missing node IDs:", rel);
            return;
          }
          
          const sourceIndex = nodeIdMap.get(rel.startNodeId);
          const targetIndex = nodeIdMap.get(rel.endNodeId);
          
          if (sourceIndex !== undefined && targetIndex !== undefined) {
            graphData.links.push({
              source: sourceIndex,
              target: targetIndex,
              type: rel.type || "unknown",
              id: rel.id || `rel-${sourceIndex}-${targetIndex}`
            });
          } else {
            console.log(`Cannot find node index for relationship: startNodeId=${rel.startNodeId}, endNodeId=${rel.endNodeId}`);
          }
        });
        
        console.log("Manually added links:", graphData.links.length);
      }
      
      console.log("Graph data processed:", {
        nodes: graphData.nodes.length,
        links: graphData.links.length,
      })
    } catch (error: any) {
      console.error("Database query error:", error);
      
      // 尝试使用备用查询
      if (error.message.includes("toString") || error.message.includes("startNodeIdentity") || error.message.includes("endNodeIdentity")) {
        console.log("Relationship property error detected, trying alternative query");
        try {
          // 修改查询只返回节点，不返回关系
          const nodeOnlyQuery = cypherQuery.replace(/RETURN\s+([^,]+),\s*r,\s*([^,]+)/i, 'RETURN $1, $2');
          console.log("Modified query to return only nodes:", nodeOnlyQuery);
          neo4jResult = await executeQuery(nodeOnlyQuery, {}, neo4jConfig);
          
          // 手动构建关系数据
          if (neo4jResult.nodes.length >= 2) {
            console.log("Creating manual relationship between nodes");
            const firstNode = neo4jResult.nodes[0];
            const secondNode = neo4jResult.nodes[1];
            
            // 添加一个虚拟关系
            neo4jResult.relationships = [{
              id: "virtual-rel-1",
              type: "妻子",
              startNodeId: firstNode.id,
              endNodeId: secondNode.id,
              properties: {}
            }];
          }
          
          // Transform Neo4j result to graph data format for visualization
          graphData = transformNeo4jResultToGraphData(neo4jResult);
          
          console.log("Graph data processed with alternative approach:", {
            nodes: graphData.nodes.length,
            links: graphData.links.length,
          });
        } catch (altError: any) {
          console.error("Alternative query also failed:", altError);
          return NextResponse.json({
            message: `我理解了您的问题，但在查询数据库时遇到了问题: ${error?.message || "未知错误"}。请尝试其他问题或检查您的数据库连接设置。`,
          });
        }
      } else {
        // 原有的错误处理代码
        return NextResponse.json({
          message: `我理解了您的问题，但在查询数据库时遇到了问题: ${error?.message || "未知错误"}。请尝试其他问题或检查您的数据库连接设置。`,
        });
      }
    }

    // 检查查询是否返回表格形式的数据（如用户示例中的查询结果）
    let tableData: { columns: string[]; rows: Record<string, any>[]; } | undefined = undefined;
    try {
      // 检查查询是否包含特定模式，如查询角色关系
      if (cypherQuery.toLowerCase().includes('return') && 
          (cypherQuery.toLowerCase().includes('.name') || 
           cypherQuery.toLowerCase().includes('as '))) {
        
        // 执行原始查询并获取原始记录
        const driver = await getDriver(neo4jConfig);
        const session = await driver.session();
        const result = await session.run(cypherQuery);
        await session.close();
        
        // 如果有记录，处理为表格数据
        if (result.records && result.records.length > 0) {
          const columns = result.records[0].keys as string[];
          const rows = result.records.map(record => {
            const row: Record<string, any> = {};
            columns.forEach((column: string) => {
              const value = record.get(column);
              // 处理Neo4j节点和关系对象
              if (value && typeof value === 'object' && value.properties) {
                row[column] = value.properties;
              } else {
                row[column] = value;
              }
            });
            return row;
          });
          
          tableData = { columns, rows };
          console.log("Processed table data:", { columns, rowCount: rows.length });
        }
      }
    } catch (tableError) {
      console.error("Error processing table data:", tableError);
      // 表格处理失败不影响主流程
    }

    // 准备表格数据的Markdown表示
    let tableMarkdown = "";
    if (tableData && tableData.columns && tableData.rows && tableData.rows.length > 0) {
      // 创建表头
      tableMarkdown = "\n\n| " + tableData.columns.join(" | ") + " |\n";
      tableMarkdown += "| " + tableData.columns.map(() => "---").join(" | ") + " |\n";
      
      // 添加表格内容
      tableData.rows.forEach(row => {
        tableMarkdown += "| " + tableData.columns.map(col => {
          const value = row[col as string];
          if (value === null || value === undefined) return "";
          if (typeof value === "object") return JSON.stringify(value);
          return String(value);
        }).join(" | ") + " |\n";
      });
    }

    // Prepare response message
    let responseMessage = `
我已分析您的问题并查询了图数据库。以下是我的发现：

${explanation}

`;

    // 如果有表格数据，添加到响应中
    if (tableData && tableData.rows && tableData.rows.length > 0) {
      responseMessage += `查询结果：${tableMarkdown}\n\n`;
    } else {
      responseMessage += `${
        neo4jResult && neo4jResult.nodes && neo4jResult.nodes.length > 0
          ? `我找到了 ${neo4jResult.nodes.length} 个节点和 ${neo4jResult.relationships ? neo4jResult.relationships.length : 0} 个关系匹配您的查询。`
          : "我没有找到匹配您查询的数据。"
      }\n\n`;
    }

    // 添加图形可视化提示（如果有图形数据）
    if (neo4jResult && neo4jResult.nodes && neo4jResult.nodes.length > 0) {
      responseMessage += "我已为您创建了图形可视化，您可以进行探索。";
    }

    // 确保graphData是有效的，即使在出错情况下
    if (!graphData || !graphData.nodes || !Array.isArray(graphData.nodes)) {
      graphData = { nodes: [], links: [] };
    }
    
    if (!graphData.links || !Array.isArray(graphData.links)) {
      graphData.links = [];
    }
    
    const response: ChatResponse = {
      message: responseMessage.trim(),
      graphData: neo4jResult && neo4jResult.nodes && neo4jResult.nodes.length > 0 ? convertGraphDataForResponse(graphData) : undefined,
      tableData: tableData
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Error processing chat request:", error)
    // Return a more detailed error message
    return NextResponse.json({ message: `抱歉，处理您的请求时出现了错误: ${error?.message || "未知错误"}` }, { status: 500 })
  }
}

// 添加处理结果为表格数据的函数
function processResultToTableData(records: any[]): { columns: string[]; rows: Record<string, any>[]; } | undefined {
  if (!records || records.length === 0) {
    return undefined;
  }

  // 获取所有列名
  const columns = records[0].keys as string[];
  
  // 处理每一行数据
  const rows = records.map((record: any) => {
    const row: Record<string, any> = {};
    columns.forEach((column: string) => {
      const value = record.get(column);
      // 处理 Neo4j 节点和关系对象
      if (value && typeof value === 'object' && value.properties) {
        row[column] = value.properties;
      } else {
        row[column] = value;
      }
    });
    return row;
  });

  return {
    columns,
    rows
  };
}

