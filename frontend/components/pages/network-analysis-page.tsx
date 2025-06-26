"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Play, MapPin, TrendingUp, Network } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import TransportMap from "@/components/TransportMap"
import { AnalysisAPI, GeoJSONAPI, CriticalNode as ApiCriticalNode } from "@/lib/api"

interface CriticalNode {
  rank: number
  nodeId: string
  type: string
  score: number
  location: string
  coordinates: [number, number]
}

interface SimulationResult {
  affectedRoutes: number
  affectedCommuters: number
  travelTimeIncrease: number
  alternateRoutesAvailable: boolean
}

export default function NetworkAnalysisPage() {
  const [analysisParams, setAnalysisParams] = useState({
    algorithm: "betweenness_centrality",
    year: 2024,
    networkType: "combined",
    topN: 10,
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<CriticalNode[]>([])
  const [networkMetrics, setNetworkMetrics] = useState({
    totalNodes: 0,
    totalEdges: 0,
    networkDensity: 0,
    averagePathLength: 0,
    diameter: 0,
  })
  const [selectedNode, setSelectedNode] = useState<CriticalNode | null>(null)
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null)
  const [showLayers, setShowLayers] = useState({
    roads: true,
    busStops: false,
    metro: false,
    criticalNodes: true,
  })

  const algorithms = [
    { value: "betweenness_centrality", label: "Betweenness Centrality" },
    { value: "closeness_centrality", label: "Closeness Centrality" },
    { value: "degree_centrality", label: "Degree Centrality" },
  ]

  const networkTypes = [
    { value: "road", label: "Road Network" },
    { value: "bus", label: "Bus Network" },
    { value: "metro", label: "Metro Network" },
    { value: "combined", label: "Combined Network" },
  ]

  const handleRunAnalysis = async () => {
    try {
      setIsAnalyzing(true)
      
      // Call analysis API with parameters
      const criticalNodes = await AnalysisAPI.getCriticalNodes({
        layer: analysisParams.networkType,
        algorithm: analysisParams.algorithm,
        count: analysisParams.topN
      })
      
      // Map API results to our CriticalNode type
      const mappedResults = criticalNodes.map((node: ApiCriticalNode, index: number) => ({
        rank: index + 1,
        nodeId: node.id,
        type: node.type || 'Intersection',
        score: node.score,
        location: node.name || `Location ${index + 1}`,
        coordinates: node.coordinates
      }));
      
      setAnalysisResults(mappedResults)
      
      // Calculate network metrics (currently using placeholder values)
      // In a real implementation, these would come from a separate API call
      setNetworkMetrics({
        totalNodes: 12546, // Example values for Bangalore transport network
        totalEdges: 28735,
        networkDensity: 0.00036,
        averagePathLength: 7.84,
        diameter: 19,
      })
    } catch (error) {
      console.error('Error fetching critical nodes:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleNodeSelect = async (node: CriticalNode) => {
    setSelectedNode(node)
    
    try {
      // Run disruption simulation when node is selected
      const simulationData = await AnalysisAPI.simulateDisruption({
        nodeIds: [node.nodeId],
        simulationType: 'complete_removal'
      })
      
      setSimulationResult({
        affectedRoutes: simulationData.affectedRoutes,
        affectedCommuters: simulationData.affectedCommuters,
        travelTimeIncrease: simulationData.travelTimeIncrease,
        alternateRoutesAvailable: simulationData.alternateRoutes.length > 0
      })
    } catch (error) {
      console.error('Error running disruption simulation:', error)
      setSimulationResult(null)
    }
  }

  const exportResults = () => {
    const csvContent = [
      ["Rank", "Node ID", "Type", "Score", "Location"],
      ...analysisResults.map((node) => [node.rank, node.nodeId, node.type, node.score.toFixed(2), node.location]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `network_analysis_${analysisParams.algorithm}_${analysisParams.year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Network className="h-8 w-8 mr-3" />
                Network Analysis
              </h1>
              <p className="text-gray-600 mt-2">Identify critical nodes in Bangalore's transport network</p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={exportResults} variant="outline" disabled={analysisResults.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
              <Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Analysis
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Control Panel */}
          <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Algorithm</Label>
                  <Select
                    value={analysisParams.algorithm}
                    onValueChange={(value) => setAnalysisParams((prev) => ({ ...prev, algorithm: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {algorithms.map((algo) => (
                        <SelectItem key={algo.value} value={algo.value}>
                          {algo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Analysis Year</Label>
                  <Select
                    value={analysisParams.year.toString()}
                    onValueChange={(value) => setAnalysisParams((prev) => ({ ...prev, year: Number.parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 13 }, (_, i) => 2013 + i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Network Type</Label>
                  <Select
                    value={analysisParams.networkType}
                    onValueChange={(value) => setAnalysisParams((prev) => ({ ...prev, networkType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {networkTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Top N Nodes</Label>
                  <Input
                    type="number"
                    value={analysisParams.topN}
                    onChange={(e) =>
                      setAnalysisParams((prev) => ({ ...prev, topN: Number.parseInt(e.target.value) || 10 }))
                    }
                    min="1"
                    max="100"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Network Metrics */}
            {analysisResults.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Network Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Nodes:</span>
                    <span className="font-medium">{networkMetrics.totalNodes.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Edges:</span>
                    <span className="font-medium">{networkMetrics.totalEdges.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Network Density:</span>
                    <span className="font-medium">{networkMetrics.networkDensity.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Path Length:</span>
                    <span className="font-medium">{networkMetrics.averagePathLength.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Diameter:</span>
                    <span className="font-medium">{networkMetrics.diameter}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <Tabs defaultValue="map" className="flex-1 flex flex-col">
              <div className="border-b px-6 pt-4">
                <TabsList>
                  <TabsTrigger value="map">Map View</TabsTrigger>
                  <TabsTrigger value="table">Results Table</TabsTrigger>
                  <TabsTrigger value="comparison">Comparison</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="map" className="flex-1 p-6">
                <div className="h-[600px] relative rounded-lg overflow-hidden border">
                  <TransportMap
                    showRoads={showLayers.roads}
                    showBusStops={showLayers.busStops}
                    showMetro={showLayers.metro}
                    showCriticalNodes={showLayers.criticalNodes}
                    height="600px"
                    onMapClick={(e) => {
                      // Handle map click to deselect node
                      if (selectedNode) setSelectedNode(null);
                    }}
                  />

                  {/* Map Legend */}
                  <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
                    <h4 className="font-medium mb-2">Criticality Score</h4>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm">High (80-100)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-sm text-muted-foreground">Impact Score</span>
                          <div className="text-2xl font-bold">{selectedNode?.score.toFixed(4)}</div>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Rank</span>
                          <div className="text-2xl font-bold">#{selectedNode?.rank}</div>
                        </div>
                      </div>
                    
                      {simulationResult && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">Disruption Impact</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-sm text-muted-foreground">Affected Routes</span>
                              <div className="text-lg font-medium">{simulationResult.affectedRoutes}</div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Affected Commuters</span>
                              <div className="text-lg font-medium">{simulationResult.affectedCommuters.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Travel Time Increase</span>
                              <div className="text-lg font-medium">{simulationResult.travelTimeIncrease.toFixed(1)}%</div>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Alternate Routes</span>
                              <div className="text-lg font-medium">
                                {simulationResult.alternateRoutesAvailable ? 'Available' : 'Limited'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="table" className="flex-1 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Critical Nodes Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analysisResults.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Node ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysisResults.map((node) => (
                            <TableRow key={node.nodeId}>
                              <TableCell>
                                <Badge variant="outline">#{node.rank}</Badge>
                              </TableCell>
                              <TableCell className="font-mono">{node.nodeId}</TableCell>
                              <TableCell>{node.type}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <span className="font-medium">{node.score.toFixed(2)}</span>
                                  <div className="ml-2 w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${node.score}%` }}></div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{node.location}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => handleNodeSelect(node)}>
                                  <MapPin className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-gray-500">Run an analysis to see results here</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comparison" className="flex-1 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Comparative Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>Comparative analysis tools coming soon</p>
                      <p className="text-sm mt-2">Compare results across years, algorithms, and network types</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
