import neo4j, { type Driver, type Session } from "neo4j-driver"
import type { Neo4jResult } from "./types"

// Connection pool for Neo4j
let driver: Driver | null = null
let driverInitPromise: Promise<Driver> | null = null
let currentConfig: { uri: string; username: string; password: string } | null = null

export function getDriver(customConfig?: { uri?: string; username?: string; password?: string }): Promise<Driver> {
  // If custom config is provided, check if it's different from current config
  if (customConfig && (customConfig.uri || customConfig.username || customConfig.password)) {
    const newUri = customConfig.uri || process.env.NEO4J_URI
    const newUsername = customConfig.username || process.env.NEO4J_USERNAME
    const newPassword = customConfig.password || process.env.NEO4J_PASSWORD

    // If we have a current config and it's different, close the driver
    if (
      driver &&
      currentConfig &&
      (newUri !== currentConfig.uri || newUsername !== currentConfig.username || newPassword !== currentConfig.password)
    ) {
      console.log("Neo4j connection parameters changed, closing existing driver")
      closeDriver()
    }

    // If we don't have a driver or it was just closed, create a new one
    if (!driver) {
      console.log("Creating new Neo4j driver with custom config")
      driverInitPromise = initDriver(customConfig)
      return driverInitPromise
    }
  }

  // If we already have a driver, return it
  if (driver) {
    return Promise.resolve(driver)
  }

  // If we're in the process of creating a driver, return that promise
  if (driverInitPromise) {
    return driverInitPromise
  }

  // Otherwise, create a new driver with default config
  console.log("Creating new Neo4j driver with default config")
  driverInitPromise = initDriver(customConfig)
  return driverInitPromise
}

async function initDriver(customConfig?: { uri?: string; username?: string; password?: string }): Promise<Driver> {
  try {
    // Use custom config if provided, otherwise use environment variables
    const uri = customConfig?.uri || process.env.NEO4J_URI
    const username = customConfig?.username || process.env.NEO4J_USERNAME
    const password = customConfig?.password || process.env.NEO4J_PASSWORD

    console.log("Initializing Neo4j driver with:", {
      uri,
      username: username ? "********" : "not provided",
      password: password ? "********" : "not provided",
    })

    if (!uri) {
      throw new Error("Neo4j URI is not set")
    }

    if (!username) {
      throw new Error("Neo4j username is not set")
    }

    if (!password) {
      throw new Error("Neo4j password is not set")
    }

    // Create the driver
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
    })

    // Store current config
    currentConfig = { uri, username, password }

    // Verify connection
    await driver.verifyConnectivity()
    console.log("Neo4j connection established successfully")
    return driver
  } catch (error) {
    console.error("Failed to create Neo4j driver:", error)
    driver = null
    driverInitPromise = null
    currentConfig = null
    throw new Error(`Failed to connect to Neo4j: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function closeDriver() {
  if (driver) {
    try {
      await driver.close()
      driver = null
      driverInitPromise = null
      currentConfig = null
      console.log("Neo4j connection closed")
    } catch (error) {
      console.error("Error closing Neo4j driver:", error instanceof Error ? error.message : String(error))
    }
  }
}

export async function executeQuery(
  query: string,
  params: Record<string, any> = {},
  customConfig?: { uri?: string; username?: string; password?: string },
): Promise<Neo4jResult> {
  let session: Session | null = null

  try {
    console.log("Executing query with custom config:", {
      hasUri: !!customConfig?.uri,
      hasUsername: !!customConfig?.username,
      hasPassword: !!customConfig?.password,
    })

    const driver = await getDriver(customConfig)
    session = driver.session()

    console.log("Executing Cypher query:", query)
    const result = await session.run(query, params)
    console.log("Query executed successfully")

    // Process nodes
    const nodesMap = new Map()
    result.records.forEach((record) => {
      record.forEach((value) => {
        if (neo4j.isNode(value)) {
          if (!nodesMap.has(value.identity.toString())) {
            nodesMap.set(value.identity.toString(), {
              id: value.identity.toString(),
              labels: value.labels,
              properties: value.properties,
            })
          }
        }
      })
    })

    // Process relationships
    const relationshipsMap = new Map()
    result.records.forEach((record) => {
      record.forEach((value) => {
        if (neo4j.isRelationship(value)) {
          if (!relationshipsMap.has(value.identity.toString())) {
            relationshipsMap.set(value.identity.toString(), {
              id: value.identity.toString(),
              type: value.type,
              startNodeId: value.start.toString(),
              endNodeId: value.end.toString(),
              properties: value.properties,
            })
          }
        }
      })
    })

    return {
      nodes: Array.from(nodesMap.values()),
      relationships: Array.from(relationshipsMap.values()),
    }
  } catch (error) {
    console.error("Error executing Neo4j query:", error)
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    if (session) {
      try {
        await session.close()
      } catch (error) {
        console.error("Error closing Neo4j session:", error)
      }
    }
  }
}

export function transformNeo4jResultToGraphData(result: Neo4jResult) {
  if (!result || !result.nodes || !result.relationships) {
    return { nodes: [], links: [] }
  }

  // Transform nodes
  const nodes = result.nodes.map((node) => ({
    id: node.id,
    label: node.labels && node.labels.length > 0 ? node.labels[0] : "Node",
    properties: node.properties || {},
  }))

  // 创建节点ID到索引的映射，以便关系可以引用节点索引
  const nodeIdMap: Record<string, number> = {}
  nodes.forEach((node, index) => {
    nodeIdMap[node.id] = index
  })

  // Transform relationships
  const links = result.relationships.map((rel) => {
    // 使用节点索引而不是ID字符串，这样ForceGraph2D可以正确渲染关系
    const sourceIndex = nodeIdMap[rel.startNodeId];
    const targetIndex = nodeIdMap[rel.endNodeId];
    
    return {
      source: sourceIndex,
      target: targetIndex,
      label: rel.type || "RELATED_TO",
      properties: rel.properties || {},
    }
  })

  return { nodes, links }
}

export async function getGraphSchema(customConfig?: { uri?: string; username?: string; password?: string }): Promise<{
  nodeLabels: string[]
  relationshipTypes: string[]
}> {
  let session: Session | null = null

  try {
    const driver = await getDriver(customConfig)
    session = driver.session()

    // Get all node labels
    const labelsResult = await session.run("CALL db.labels()")
    const nodeLabels = labelsResult.records.map((record) => record.get(0))

    // Get all relationship types
    const relTypesResult = await session.run("CALL db.relationshipTypes()")
    const relationshipTypes = relTypesResult.records.map((record) => record.get(0))

    return {
      nodeLabels,
      relationshipTypes,
    }
  } catch (error) {
    console.error("Error fetching graph schema:", error instanceof Error ? error.message : String(error))
    return {
      nodeLabels: [],
      relationshipTypes: [],
    }
  } finally {
    if (session) {
      await session.close()
    }
  }
}

// Add a function to get node properties for each label
export async function getNodeProperties(customConfig?: { uri?: string; username?: string; password?: string }): Promise<
  Record<string, string[]>
> {
  let session: Session | null = null

  try {
    const driver = await getDriver(customConfig)
    session = driver.session()

    const { nodeLabels } = await getGraphSchema(customConfig)
    const nodeProperties: Record<string, string[]> = {}

    for (const label of nodeLabels) {
      try {
        // Sample a node with this label to get its properties
        const result = await session.run(`MATCH (n:${label}) RETURN n LIMIT 1`)

        if (result.records.length > 0) {
          const node = result.records[0].get("n")
          nodeProperties[label] = Object.keys(node.properties)
        } else {
          nodeProperties[label] = []
        }
      } catch (error) {
        console.error(`Error fetching properties for label ${label}:`, error instanceof Error ? error.message : String(error))
        nodeProperties[label] = []
      }
    }

    return nodeProperties
  } catch (error) {
    console.error("Error fetching node properties:", error instanceof Error ? error.message : String(error))
    return {}
  } finally {
    if (session) {
      await session.close()
    }
  }
}

