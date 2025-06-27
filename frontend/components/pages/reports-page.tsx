"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Eye, Plus, Search, Calendar, Filter } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { ReportsAPI, Report, ReportType, ReportTemplate } from "@/lib/api"

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [isGenerating, setIsGenerating] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportParams, setReportParams] = useState({
    type: "traffic",
    title: "",
    description: "",
    data_source: "historical",
    date_range: "last-week",
    format: "json",
    template: "standard",
    area: "",
    include_traffic: true,
    include_network: true,
    include_forecast: false,
  })

  const dataSourceOptions = [
    { value: "historical", label: "Historical Data" },
    { value: "realtime", label: "Real-time Snapshot" },
    { value: "analysis", label: "Saved Analysis Results" },
    { value: "forecast", label: "Forecast Results" },
  ]

  const formatOptions = [
    { value: "json", label: "JSON Data" },
    { value: "pdf", label: "PDF Document" },
    { value: "png", label: "PNG Image" },
    { value: "html", label: "Interactive HTML" },
  ]

  const dateRangeOptions = [
    { value: "last-hour", label: "Last Hour" },
    { value: "last-day", label: "Last 24 Hours" },
    { value: "last-week", label: "Last Week" },
    { value: "last-month", label: "Last Month" },
    { value: "custom", label: "Custom Range" },
  ]

  // Load initial data
  useEffect(() => {
    loadReports()
    loadReportTypes()
    loadReportTemplates()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const reportsData = await ReportsAPI.getReports()
      setReports(reportsData)
      setError(null)
    } catch (err) {
      console.error("Failed to load reports:", err)
      setError("Failed to load reports")
    } finally {
      setLoading(false)
    }
  }

  const loadReportTypes = async () => {
    try {
      const typesData = await ReportsAPI.getReportTypes()
      setReportTypes(typesData)
    } catch (err) {
      console.error("Failed to load report types:", err)
    }
  }

  const loadReportTemplates = async () => {
    try {
      const templatesData = await ReportsAPI.getReportTemplates()
      setReportTemplates(templatesData)
    } catch (err) {
      console.error("Failed to load report templates:", err)
    }
  }

  const generateReport = async () => {
    if (!reportParams.title.trim()) {
      setError("Please enter a report title")
      return
    }

    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await ReportsAPI.generateReport(reportParams)
      console.log("Report generated:", response)
      
      // Reload reports list
      await loadReports()
      
      // Reset form
      setReportParams({
        ...reportParams,
        title: "",
        description: ""
      })
      
    } catch (err) {
      console.error("Report generation failed:", err)
      setError(`Failed to generate report: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === "all" || report.type.toLowerCase().includes(selectedType)
    return matchesSearch && matchesType
  })

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="h-8 w-8 mr-3" />
                Reports
              </h1>
              <p className="text-gray-600 mt-2">Generate and manage analysis reports</p>
            </div>
            <Button onClick={() => setReportParams({ ...reportParams, title: "", description: "" })}>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Report Generator Panel */}
          <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Generator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Report Type</Label>
                  <Select
                    value={reportParams.type}
                    onValueChange={(value) => setReportParams((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={reportParams.title}
                    onChange={(e) => setReportParams((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter report title"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={reportParams.description}
                    onChange={(e) => setReportParams((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the report"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Data Source</Label>
                  <Select
                    value={reportParams.data_source}
                    onValueChange={(value) => setReportParams((prev) => ({ ...prev, data_source: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSourceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Date Range</Label>
                  <Select
                    value={reportParams.date_range}
                    onValueChange={(value) => setReportParams((prev) => ({ ...prev, date_range: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateRangeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Output Format</Label>
                  <Select
                    value={reportParams.format}
                    onValueChange={(value) => setReportParams((prev) => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Template</Label>
                  <Select
                    value={reportParams.template}
                    onValueChange={(value) => setReportParams((prev) => ({ ...prev, template: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTemplates.map((template) => (
                        <SelectItem key={template.value} value={template.value}>
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={generateReport} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            {/* Scheduled Reports */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Scheduled Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-sm">Weekly Traffic Summary</div>
                    <div className="text-xs text-gray-500">Every Monday at 9:00 AM</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-sm">Monthly Network Analysis</div>
                    <div className="text-xs text-gray-500">1st of every month</div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <Calendar className="h-4 w-4 mr-2" />
                    Manage Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <Tabs defaultValue="catalog" className="flex-1 flex flex-col">
              <div className="border-b px-6 pt-4">
                <TabsList>
                  <TabsTrigger value="catalog">Report Catalog</TabsTrigger>
                  <TabsTrigger value="generator">Static Map Generator</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="catalog" className="flex-1 p-6">
                {/* Search and Filter */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search reports..."
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    More Filters
                  </Button>
                </div>

                {/* Reports Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loading ? (
                    <div className="col-span-full text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading reports...</p>
                    </div>
                  ) : error ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-red-600">{error}</p>
                      <Button onClick={loadReports} className="mt-2">
                        Retry
                      </Button>
                    </div>
                  ) : filteredReports.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No reports found</p>
                    </div>
                  ) : (
                    filteredReports.map((report) => (
                      <Card key={report.id} className="hover:shadow-lg transition-shadow">
                        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden flex items-center justify-center">
                          <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-lg truncate">{report.title}</h3>
                            <Badge variant="outline">{report.type}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{report.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <span>{new Date(report.created_date).toLocaleDateString()}</span>
                            <span>{report.size}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {report.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {filteredReports.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg mb-2">No reports found</p>
                    <p>Try adjusting your search criteria or generate a new report</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="generator" className="flex-1 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Static Map Generator</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label>Map Type</Label>
                          <Select defaultValue="roadmap">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="roadmap">Roadmap</SelectItem>
                              <SelectItem value="satellite">Satellite</SelectItem>
                              <SelectItem value="terrain">Terrain</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Zoom Level</Label>
                          <Input type="number" defaultValue="11" min="1" max="20" />
                        </div>

                        <div>
                          <Label>Center Coordinates</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Latitude" defaultValue="12.9716" />
                            <Input placeholder="Longitude" defaultValue="77.5946" />
                          </div>
                        </div>

                        <div>
                          <Label>Export Resolution</Label>
                          <Select defaultValue="1920x1080">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                              <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                              <SelectItem value="800x600">800x600 (Standard)</SelectItem>
                              <SelectItem value="custom">Custom Size</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Generate Static Map
                        </Button>
                      </div>

                      <div className="bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-2"></div>
                          <p>Map Preview</p>
                          <p className="text-sm">Configure settings to see preview</p>
                        </div>
                      </div>
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
