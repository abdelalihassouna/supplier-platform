"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Bell,
  Settings,
  User,
  Menu,
  X,
  Home,
  Building2,
  GitBranch,
  FolderOpen,
  FolderSyncIcon as Sync,
  Download,
  ChevronRight,
  BarChart3,
  Plug,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const pathname = usePathname()
  const { toast } = useToast()

  const handleSync = async (syncType: "incremental" | "full") => {
    try {
      setSyncing(true)

      const response = await fetch("/api/suppliers/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sync_type: syncType === "full" ? "FULL" : "INCREMENTAL",
        }),
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Sync Completed",
          description: `Successfully synced ${result.sync_log?.total_fetched || 0} suppliers`,
        })
      }
    } catch (error) {
      console.error("Error syncing:", error)
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const navigationItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Building2, label: "Suppliers Management", href: "/suppliers" },
    { icon: GitBranch, label: "Verification Workflows", href: "/workflows" },
    {
      icon: FolderOpen,
      label: "Projects",
      href: "/projects",
      children: [
        { label: "Q1 2024 Audit", href: "/projects/q1-audit" },
        { label: "ISO 9001 Migration", href: "/projects/iso-migration" },
      ],
    },
    { icon: BarChart3, label: "Analytics & Reporting", href: "/analytics" },
    { icon: Plug, label: "Integration Management", href: "/integrations" },
    { icon: User, label: "Profile", href: "/profile" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ]

  const generateBreadcrumb = () => {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) return "Dashboard"

    const pathMap: Record<string, string> = {
      suppliers: "Suppliers Management",
      workflows: "Verification Workflows",
      projects: "Projects",
      onboarding: "Supplier Onboarding",
      settings: "Settings",
      profile: "Profile",
      verification: "Document Verification",
      analytics: "Analytics & Reporting",
      integrations: "Integration Management",
    }

    return segments.map((segment) => pathMap[segment] || segment).join(" / ")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
            {sidebarOpen && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-sidebar-foreground">CertifyPro</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigationItems.map((item, index) => (
              <div key={index}>
                <Link href={item.href}>
                  <Button
                    variant={pathname === item.href ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start text-left",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      !sidebarOpen && "px-2",
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", sidebarOpen && "mr-3")} />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.children && <ChevronRight className="w-4 h-4" />}
                      </>
                    )}
                  </Button>
                </Link>
                {item.children && sidebarOpen && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children.map((child, childIndex) => (
                      <Link key={childIndex} href={child.href}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                          {child.label}
                        </Button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-16")}>
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background border-b border-border">
          <div className="flex h-16 items-center justify-between px-6">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{generateBreadcrumb()}</span>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search suppliers, documents..." className="pl-10 w-80" />
              </div>

              {/* Sync Controls */}
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleSync("incremental")} disabled={syncing}>
                  {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sync className="w-4 h-4 mr-2" />}
                  Sync from Jaggaer
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSync("full")} disabled={syncing}>
                  {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sync className="w-4 h-4 mr-2" />}
                  Full Sync
                </Button>
              </div>

              {/* Export */}
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
                  3
                </Badge>
              </Button>

              {/* User Profile */}
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
