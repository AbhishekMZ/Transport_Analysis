"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Settings, User, Key, Database, Bell, Info, Trash2, RefreshCw } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"

export default function SettingsPage() {
  const [userPrefs, setUserPrefs] = useState({
    defaultLat: 12.9716,
    defaultLng: 77.5946,
    defaultZoom: 11,
    mapType: "roadmap",
    theme: "system",
    units: "metric",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    language: "en",
  })

  const [notifications, setNotifications] = useState({
    majorIncidents: true,
    criticalNodes: true,
    systemUpdates: false,
    reportCompletions: true,
    inApp: true,
    browser: true,
    email: false,
  })

  const [apiStatus, setApiStatus] = useState({
    googleMaps: { status: "connected", quota: 85 },
    tomtom: { status: "connected", quota: 42 },
    backend: { status: "connected", quota: 0 },
  })

  const [cacheInfo, setCacheInfo] = useState({
    totalSize: "245 MB",
    mapCache: "156 MB",
    dataCache: "89 MB",
    lastCleared: "2024-01-10",
  })

  const clearCache = (type: string) => {
    console.log(`Clearing ${type} cache`)
    // Simulate cache clearing
  }

  const testApiConnection = (api: string) => {
    console.log(`Testing ${api} connection`)
    // Simulate API test
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Settings className="h-8 w-8 mr-3" />
                Settings
              </h1>
              <p className="text-gray-600 mt-2">Configure your TransiGenius dashboard preferences</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <Tabs defaultValue="preferences" className="max-w-4xl">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="preferences">
                <User className="h-4 w-4 mr-2" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="api">
                <Key className="h-4 w-4 mr-2" />
                API Config
              </TabsTrigger>
              <TabsTrigger value="cache">
                <Database className="h-4 w-4 mr-2" />
                Data Cache
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="system">
                <Info className="h-4 w-4 mr-2" />
                System Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preferences" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Default Map Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Default Latitude</Label>
                      <Input
                        type="number"
                        value={userPrefs.defaultLat}
                        onChange={(e) =>
                          setUserPrefs((prev) => ({ ...prev, defaultLat: Number.parseFloat(e.target.value) }))
                        }
                        step="0.0001"
                      />
                    </div>
                    <div>
                      <Label>Default Longitude</Label>
                      <Input
                        type="number"
                        value={userPrefs.defaultLng}
                        onChange={(e) =>
                          setUserPrefs((prev) => ({ ...prev, defaultLng: Number.parseFloat(e.target.value) }))
                        }
                        step="0.0001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Default Zoom Level</Label>
                      <Input
                        type="number"
                        value={userPrefs.defaultZoom}
                        onChange={(e) =>
                          setUserPrefs((prev) => ({ ...prev, defaultZoom: Number.parseInt(e.target.value) }))
                        }
                        min="1"
                        max="20"
                      />
                    </div>
                    <div>
                      <Label>Preferred Map Type</Label>
                      <Select
                        value={userPrefs.mapType}
                        onValueChange={(value) => setUserPrefs((prev) => ({ ...prev, mapType: value }))}
                      >
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
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Display Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Theme</Label>
                      <Select
                        value={userPrefs.theme}
                        onValueChange={(value) => setUserPrefs((prev) => ({ ...prev, theme: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Units</Label>
                      <Select
                        value={userPrefs.units}
                        onValueChange={(value) => setUserPrefs((prev) => ({ ...prev, units: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="metric">Metric</SelectItem>
                          <SelectItem value="imperial">Imperial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date Format</Label>
                      <Select
                        value={userPrefs.dateFormat}
                        onValueChange={(value) => setUserPrefs((prev) => ({ ...prev, dateFormat: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Time Format</Label>
                      <Select
                        value={userPrefs.timeFormat}
                        onValueChange={(value) => setUserPrefs((prev) => ({ ...prev, timeFormat: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12h">12 Hour</SelectItem>
                          <SelectItem value="24h">24 Hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Connections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(apiStatus).map(([api, info]) => (
                    <div key={api} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${info.status === "connected" ? "bg-green-500" : "bg-red-500"}`}
                        ></div>
                        <div>
                          <div className="font-medium capitalize">{api.replace(/([A-Z])/g, " $1")}</div>
                          <div className="text-sm text-gray-500">
                            Status: {info.status}
                            {info.quota > 0 && ` • Quota: ${info.quota}%`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {info.quota > 0 && (
                          <div className="w-24">
                            <Progress value={info.quota} className="h-2" />
                          </div>
                        )}
                        <Button size="sm" variant="outline" onClick={() => testApiConnection(api)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Google Maps API Key</Label>
                    <div className="flex space-x-2">
                      <Input type="password" placeholder="••••••••••••••••" />
                      <Button variant="outline">Update</Button>
                    </div>
                  </div>
                  <div>
                    <Label>TomTom API Key</Label>
                    <div className="flex space-x-2">
                      <Input type="password" placeholder="••••••••••••••••" />
                      <Button variant="outline">Update</Button>
                    </div>
                  </div>
                  <div>
                    <Label>Backend API URL</Label>
                    <div className="flex space-x-2">
                      <Input placeholder="https://api.transigenius.com" />
                      <Button variant="outline">Update</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cache" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cache Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{cacheInfo.totalSize}</div>
                      <div className="text-sm text-gray-600">Total Cache Size</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{cacheInfo.lastCleared}</div>
                      <div className="text-sm text-gray-600">Last Cleared</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Map Cache</div>
                        <div className="text-sm text-gray-500">{cacheInfo.mapCache}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => clearCache("map")}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Data Cache</div>
                        <div className="text-sm text-gray-500">{cacheInfo.dataCache}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => clearCache("data")}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>
                  </div>

                  <Button variant="destructive" onClick={() => clearCache("all")} className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All Cache
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alert Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(notifications)
                    .slice(0, 4)
                    .map(([key, enabled]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                          <div className="text-sm text-gray-500">
                            {key === "majorIncidents" && "Get notified about major traffic incidents"}
                            {key === "criticalNodes" && "Alerts for critical node disruptions"}
                            {key === "systemUpdates" && "System maintenance and updates"}
                            {key === "reportCompletions" && "When reports finish generating"}
                          </div>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [key]: checked }))}
                        />
                      </div>
                    ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(notifications)
                    .slice(4)
                    .map(([key, enabled]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                          <div className="text-sm text-gray-500">
                            {key === "inApp" && "Show notifications within the dashboard"}
                            {key === "browser" && "Browser push notifications"}
                            {key === "email" && "Email notifications (requires setup)"}
                          </div>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [key]: checked }))}
                        />
                      </div>
                    ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Application Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Version</Label>
                      <div className="font-medium">v1.2.0</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Build</Label>
                      <div className="font-medium">#2024.01.15</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Last Updated</Label>
                      <div className="font-medium">January 15, 2024</div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Environment</Label>
                      <Badge variant="outline">Production</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Backend Connection</span>
                      <Badge className="bg-green-500">Healthy</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Data Synchronization</span>
                      <Badge className="bg-green-500">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Real-time Updates</span>
                      <Badge className="bg-green-500">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last Sync</span>
                      <span className="text-sm text-gray-500">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Browser Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">User Agent:</span>
                    <span className="text-sm font-mono">Chrome/120.0.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Screen Resolution:</span>
                    <span className="text-sm font-mono">1920x1080</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Timezone:</span>
                    <span className="text-sm font-mono">Asia/Kolkata</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}
