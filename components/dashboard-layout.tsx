"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  LogOut,
  UserCircle,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "@/lib/actions"

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface UserData {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: string
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
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

  const fetchUserData = async () => {
    try {
      setUserLoading(true)
      const response = await fetch("/api/profile")
      
      if (!response.ok) {
        throw new Error("Failed to fetch user data")
      }
      
      const userData = await response.json()
      setUser(userData)
    } catch (error) {
      console.error("Error fetching user data:", error)
      // Don't show toast error for user data fetch as it's not critical
    } finally {
      setUserLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      })
      router.push("/auth/login")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Sign out failed",
        description: "An error occurred while signing out.",
        variant: "destructive",
      })
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
          <div className="flex h-20 items-center justify-between px-4 border-b border-sidebar-border bg-gradient-to-r from-sidebar to-sidebar/95">
            {sidebarOpen && (
              <div className="flex items-center space-x-4 group cursor-pointer hover:opacity-90 transition-opacity">
                <div className="relative w-14 h-14 flex-shrink-0">
                  <Image
                    src="/logo-extended.png"
                    alt="Supplier Platform Logo"
                    fill
                    className="object-contain drop-shadow-sm"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-lg text-sidebar-foreground truncate">
                    <i>Pizzarotti</i> <span className="text-primary">V-AI</span>
                  </span>
                  <span className="text-xs text-muted-foreground/80 truncate">
                    Vendor AI
                  </span>
                </div>
              </div>
            )}
            {!sidebarOpen && (
              <div className="flex items-center justify-center w-full group">
                <div className="relative w-12 h-12 hover:scale-105 transition-transform duration-200">
                  <Image
                    src="/logo.png"
                    alt="Supplier Platform Logo"
                    fill
                    className="object-contain drop-shadow-sm"
                  />
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground transition-all duration-200 rounded-md p-2"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
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
            {/* Breadcrumb (hidden on single-level routes to avoid duplicating H1) */}
            {pathname.split("/").filter(Boolean).length > 1 ? (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{generateBreadcrumb()}</span>
              </div>
            ) : (
              <div />
            )}

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              {/* Search (hidden on /suppliers routes) */}
              {!pathname.startsWith('/suppliers') && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search suppliers, documents..." className="pl-10 w-80" />
                </div>
              )}

              {/* Sync Controls (grouped) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={syncing}>
                    {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sync className="w-4 h-4 mr-2" />}
                    Sync
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Sync from Jaggaer</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleSync("incremental")} disabled={syncing}>
                    <Sync className="w-4 h-4 mr-2" />
                    Incremental Sync
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSync("full")} disabled={syncing}>
                    <Sync className="w-4 h-4 mr-2" />
                    Full Sync
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export (grouped) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Export Suppliers</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => window.open('/api/export?type=suppliers&format=csv', '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => window.open('/api/export?type=suppliers&format=json', '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
                  3
                </Badge>
              </Button>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <UserCircle className="w-4 h-4" />
                    <span>
                      {userLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : user ? (
                        user.firstName || user.email.split('@')[0]
                      ) : (
                        "User"
                      )}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userLoading ? (
                          "Loading..."
                        ) : user ? (
                          user.fullName || `${user.firstName} ${user.lastName}`.trim() || user.email.split('@')[0]
                        ) : (
                          "Unknown User"
                        )}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userLoading ? "" : user?.email || "No email"}
                      </p>
                      {user?.role && (
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.role}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
