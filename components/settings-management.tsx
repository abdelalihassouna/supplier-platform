"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Download,
  Trash2,
  FileText,
  ExternalLink,
} from "lucide-react"

export function SettingsManagement() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: true,
    workflow: true,
  })

  const [preferences, setPreferences] = useState({
    darkMode: false,
    language: "en",
    timezone: "UTC",
    autoSync: true,
  })

  const [integrationConfig, setIntegrationConfig] = useState({
    jaggaer: {
      baseUrl: process.env.NEXT_PUBLIC_JAGGAER_BASE_URL || "",
      clientId: "",
      clientSecret: "",
      syncInterval: "24",
    },
    italianGov: {
      durcEndpoint: "",
      soaEndpoint: "",
      whiteListEndpoint: "",
      apiKey: "",
    },
    email: {
      provider: "smtp",
      smtpHost: "",
      smtpPort: "587",
      username: "",
      password: "",
    },
    mistral: {
      apiKey: "",
      model: "mistral-large-latest",
      maxTokens: "4000",
    },
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Helper: load a specific integration setting from server
  const loadIntegrationSetting = async (key: "jaggaer" | "mistral" | "italian-gov" | "email") => {
    try {
      const res = await fetch(`/api/system-settings/${key}`, { cache: "no-store" })
      if (!res.ok) return
      const json = await res.json()
      const data = json?.data || {}
      setIntegrationConfig((prev) => ({
        ...prev,
        ...(key === "jaggaer"
          ? { jaggaer: { ...prev.jaggaer, ...data } }
          : key === "mistral"
          ? { mistral: { ...prev.mistral, ...data } }
          : key === "italian-gov"
          ? { italianGov: { ...prev.italianGov, ...data } }
          : { email: { ...prev.email, ...data } }),
      }))
    } catch (_) {
      // no-op to avoid leaking details
    }
  }

  // When opening a dialog, pre-load its persisted configuration
  useEffect(() => {
    if (!openDialog) return
    if (openDialog === "jaggaer") loadIntegrationSetting("jaggaer")
    if (openDialog === "mistral") loadIntegrationSetting("mistral")
    if (openDialog === "italian-gov") loadIntegrationSetting("italian-gov")
    if (openDialog === "email") loadIntegrationSetting("email")
  }, [openDialog])

  const handleDarkModeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light")
    setPreferences((prev) => ({ ...prev, darkMode: checked }))
  }

  const handleSaveIntegrationConfig = async (integrationType: string) => {
    setIsLoading(true)
    try {
      // Map integration type to key and payload
      let key: "jaggaer" | "mistral" | "italian-gov" | "email"
      let payload: any = {}
      switch (integrationType) {
        case "Jaggaer":
          key = "jaggaer"
          payload = {
            baseUrl: integrationConfig.jaggaer.baseUrl,
            clientId: integrationConfig.jaggaer.clientId,
            clientSecret: integrationConfig.jaggaer.clientSecret,
            syncInterval: integrationConfig.jaggaer.syncInterval,
          }
          break
        case "Mistral OCR":
          key = "mistral"
          payload = {
            apiKey: integrationConfig.mistral.apiKey,
            model: integrationConfig.mistral.model,
            maxTokens: integrationConfig.mistral.maxTokens,
          }
          break
        case "Italian Government APIs":
          key = "italian-gov"
          payload = {
            durcEndpoint: integrationConfig.italianGov.durcEndpoint,
            soaEndpoint: integrationConfig.italianGov.soaEndpoint,
            whiteListEndpoint: integrationConfig.italianGov.whiteListEndpoint,
            apiKey: integrationConfig.italianGov.apiKey,
          }
          break
        case "Email Service":
          key = "email"
          payload = {
            provider: integrationConfig.email.provider,
            smtpHost: integrationConfig.email.smtpHost,
            smtpPort: integrationConfig.email.smtpPort,
            username: integrationConfig.email.username,
            password: integrationConfig.email.password,
          }
          break
        default:
          throw new Error("Unknown integration type")
      }

      const res = await fetch(`/api/system-settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to save configuration")
      }

      toast({
        title: "Configuration Saved",
        description: `${integrationType} integration has been configured successfully.`,
      })
      setOpenDialog(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = async () => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({
        title: "Export Complete",
        description: "Your data has been exported successfully. Download will start shortly.",
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearCache = async () => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Cache Cleared",
        description: "All cached data has been cleared successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewLogs = () => {
    window.open("/api/logs", "_blank")
    toast({
      title: "Opening Logs",
      description: "System logs will open in a new tab.",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and system preferences</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700">
          <Settings className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal and company information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="Marco" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Rossi" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="marco.rossi@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" defaultValue="Procurement Solutions Italia" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" defaultValue="Procurement Manager" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
              <CardDescription>Configure your system behavior and defaults</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-sync suppliers</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically sync supplier data every 24 hours
                  </p>
                </div>
                <Switch
                  checked={preferences.autoSync}
                  onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, autoSync: checked }))}
                />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select className="w-full p-2 border rounded-md bg-background" defaultValue="en">
                    <option value="en">English</option>
                    <option value="it">Italiano</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select className="w-full p-2 border rounded-md bg-background" defaultValue="UTC">
                    <option value="UTC">UTC</option>
                    <option value="Europe/Rome">Europe/Rome</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to be notified about important events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, email: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive browser push notifications</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, push: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive critical alerts via SMS</p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, sms: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Workflow Notifications</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about workflow status changes</p>
                </div>
                <Switch
                  checked={notifications.workflow}
                  onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, workflow: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage your account security and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button className="bg-violet-600 hover:bg-violet-700">Update Password</Button>

              <Separator className="my-6" />

              <div className="space-y-4">
                <h4 className="font-medium">Two-Factor Authentication</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable 2FA</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-800"
                  >
                    Not Enabled
                  </Badge>
                </div>
                <Button variant="outline">Setup Two-Factor Authentication</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Integration Settings
              </CardTitle>
              <CardDescription>Configure external system connections and API settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* Jaggaer Integration */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Jaggaer Integration</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Supplier data synchronization</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {integrationConfig.jaggaer.baseUrl && integrationConfig.jaggaer.clientId && integrationConfig.jaggaer.clientSecret
                        ? "Connected"
                        : "Not Configured"}
                    </Badge>
                    <Dialog
                      open={openDialog === "jaggaer"}
                      onOpenChange={(open) => setOpenDialog(open ? "jaggaer" : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Configure Jaggaer Integration</DialogTitle>
                          <DialogDescription>Set up your Jaggaer API connection and sync preferences</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="jaggaer-url">Base URL</Label>
                            <Input
                              id="jaggaer-url"
                              value={integrationConfig.jaggaer.baseUrl}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  jaggaer: { ...prev.jaggaer, baseUrl: e.target.value },
                                }))
                              }
                              placeholder="https://api.jaggaer.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="jaggaer-client">Client ID</Label>
                            <Input
                              id="jaggaer-client"
                              value={integrationConfig.jaggaer.clientId}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  jaggaer: { ...prev.jaggaer, clientId: e.target.value },
                                }))
                              }
                              placeholder="Your Jaggaer client ID"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="jaggaer-secret">Client Secret</Label>
                            <Input
                              id="jaggaer-secret"
                              type="password"
                              value={integrationConfig.jaggaer.clientSecret}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  jaggaer: { ...prev.jaggaer, clientSecret: e.target.value },
                                }))
                              }
                              placeholder="Your Jaggaer client secret"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sync-interval">Sync Interval (hours)</Label>
                            <Input
                              id="sync-interval"
                              type="number"
                              value={integrationConfig.jaggaer.syncInterval}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  jaggaer: { ...prev.jaggaer, syncInterval: e.target.value },
                                }))
                              }
                              placeholder="24"
                            />
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => handleSaveIntegrationConfig("Jaggaer")}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              {isLoading ? "Saving..." : "Save Configuration"}
                            </Button>
                            <Button variant="outline" onClick={() => setOpenDialog(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Mistral OCR Service</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Document extraction and analysis</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-800"
                    >
                      {integrationConfig.mistral.apiKey ? "Connected" : "Not Configured"}
                    </Badge>
                    <Dialog
                      open={openDialog === "mistral"}
                      onOpenChange={(open) => setOpenDialog(open ? "mistral" : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Configure Mistral OCR Service</DialogTitle>
                          <DialogDescription>Set up your Mistral API for document extraction</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="mistral-api-key">API Key</Label>
                            <Input
                              id="mistral-api-key"
                              type="password"
                              value={integrationConfig.mistral.apiKey}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  mistral: { ...prev.mistral, apiKey: e.target.value },
                                }))
                              }
                              placeholder="Your Mistral API key"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mistral-model">Model</Label>
                            <select
                              id="mistral-model"
                              className="w-full p-2 border rounded-md bg-background"
                              value={integrationConfig.mistral.model}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  mistral: { ...prev.mistral, model: e.target.value },
                                }))
                              }
                            >
                              <option value="mistral-large-latest">Mistral Large (Latest)</option>
                              <option value="mistral-medium-latest">Mistral Medium (Latest)</option>
                              <option value="mistral-small-latest">Mistral Small (Latest)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mistral-tokens">Max Tokens</Label>
                            <Input
                              id="mistral-tokens"
                              type="number"
                              value={integrationConfig.mistral.maxTokens}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  mistral: { ...prev.mistral, maxTokens: e.target.value },
                                }))
                              }
                              placeholder="4000"
                            />
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => handleSaveIntegrationConfig("Mistral OCR")}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              {isLoading ? "Saving..." : "Save Configuration"}
                            </Button>
                            <Button variant="outline" onClick={() => setOpenDialog(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Italian Government APIs */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Italian Government APIs</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">DURC, SOA, and compliance verification</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Connected
                    </Badge>
                    <Dialog
                      open={openDialog === "italian-gov"}
                      onOpenChange={(open) => setOpenDialog(open ? "italian-gov" : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Configure Italian Government APIs</DialogTitle>
                          <DialogDescription>Set up connections to Italian regulatory services</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="durc-endpoint">DURC Endpoint</Label>
                            <Input
                              id="durc-endpoint"
                              value={integrationConfig.italianGov.durcEndpoint}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  italianGov: { ...prev.italianGov, durcEndpoint: e.target.value },
                                }))
                              }
                              placeholder="https://durc.gov.it/api"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="soa-endpoint">SOA Endpoint</Label>
                            <Input
                              id="soa-endpoint"
                              value={integrationConfig.italianGov.soaEndpoint}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  italianGov: { ...prev.italianGov, soaEndpoint: e.target.value },
                                }))
                              }
                              placeholder="https://soa.gov.it/api"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="api-key">API Key</Label>
                            <Input
                              id="api-key"
                              type="password"
                              value={integrationConfig.italianGov.apiKey}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  italianGov: { ...prev.italianGov, apiKey: e.target.value },
                                }))
                              }
                              placeholder="Your government API key"
                            />
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => handleSaveIntegrationConfig("Italian Government APIs")}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              {isLoading ? "Saving..." : "Save Configuration"}
                            </Button>
                            <Button variant="outline" onClick={() => setOpenDialog(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Email Service */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Email Service</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notification delivery system</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-800"
                    >
                      Pending
                    </Badge>
                    <Dialog open={openDialog === "email"} onOpenChange={(open) => setOpenDialog(open ? "email" : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Setup
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Configure Email Service</DialogTitle>
                          <DialogDescription>Set up your email delivery service for notifications</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="smtp-host">SMTP Host</Label>
                            <Input
                              id="smtp-host"
                              value={integrationConfig.email.smtpHost}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  email: { ...prev.email, smtpHost: e.target.value },
                                }))
                              }
                              placeholder="smtp.gmail.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="smtp-port">SMTP Port</Label>
                            <Input
                              id="smtp-port"
                              value={integrationConfig.email.smtpPort}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  email: { ...prev.email, smtpPort: e.target.value },
                                }))
                              }
                              placeholder="587"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email-username">Username</Label>
                            <Input
                              id="email-username"
                              value={integrationConfig.email.username}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  email: { ...prev.email, username: e.target.value },
                                }))
                              }
                              placeholder="your-email@company.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email-password">Password</Label>
                            <Input
                              id="email-password"
                              type="password"
                              value={integrationConfig.email.password}
                              onChange={(e) =>
                                setIntegrationConfig((prev) => ({
                                  ...prev,
                                  email: { ...prev.email, password: e.target.value },
                                }))
                              }
                              placeholder="Your email password"
                            />
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button
                              onClick={() => handleSaveIntegrationConfig("Email Service")}
                              disabled={isLoading}
                              className="flex-1"
                            >
                              {isLoading ? "Saving..." : "Save Configuration"}
                            </Button>
                            <Button variant="outline" onClick={() => setOpenDialog(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance Settings
              </CardTitle>
              <CardDescription>Customize the look and feel of your dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Switch to dark theme</p>
                </div>
                {mounted && <Switch checked={theme === "dark"} onCheckedChange={handleDarkModeToggle} />}
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Theme Color</Label>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-600 border-2 border-violet-800 cursor-pointer"></div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-transparent cursor-pointer hover:border-blue-800"></div>
                  <div className="w-8 h-8 rounded-full bg-green-600 border-2 border-transparent cursor-pointer hover:border-green-800"></div>
                  <div className="w-8 h-8 rounded-full bg-orange-600 border-2 border-transparent cursor-pointer hover:border-orange-800"></div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Dashboard Density</Label>
                <select className="w-full p-2 border rounded-md bg-background" defaultValue="comfortable">
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                  <option value="spacious">Spacious</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Advanced Settings
              </CardTitle>
              <CardDescription>Advanced configuration options and system maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Data Export</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Export all your supplier data and reports
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2 bg-transparent"
                    size="sm"
                    onClick={handleExportData}
                    disabled={isLoading}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isLoading ? "Exporting..." : "Export Data"}
                  </Button>
                </div>

                <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <h4 className="font-medium text-red-800 dark:text-red-200">Clear Cache</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">Clear all cached data and force refresh</p>
                  <Button
                    variant="outline"
                    className="mt-2 bg-transparent"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isLoading ? "Clearing..." : "Clear Cache"}
                  </Button>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">System Logs</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    View system logs and debugging information
                  </p>
                  <Button variant="outline" className="mt-2 bg-transparent" size="sm" onClick={handleViewLogs}>
                    <FileText className="w-4 h-4 mr-2" />
                    <ExternalLink className="w-3 h-3 ml-1" />
                    View Logs
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
