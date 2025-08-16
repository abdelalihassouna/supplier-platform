"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar"
import { User, Calendar, Shield, Activity } from "lucide-react"

export function ProfileManagement() {
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    firstName: "Marco",
    lastName: "Rossi",
    email: "marco.rossi@company.com",
    phone: "+39 02 1234 5678",
    company: "Procurement Solutions Italia",
    role: "Procurement Manager",
    department: "Supply Chain",
    location: "Milano, Italy",
    joinDate: "2023-01-15",
  })

  const recentActivity = [
    { action: "Verified supplier certification", supplier: "ABC Construction Srl", time: "2 hours ago" },
    { action: "Downloaded DURC document", supplier: "Tech Solutions SpA", time: "4 hours ago" },
    { action: "Approved workflow task", supplier: "Green Energy Ltd", time: "1 day ago" },
    { action: "Updated supplier scorecard", supplier: "Industrial Parts Srl", time: "2 days ago" },
    { action: "Generated compliance report", supplier: "Multiple suppliers", time: "3 days ago" },
  ]

  const handleSave = () => {
    setIsEditing(false)
    // Save profile logic here
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal information and account settings</p>
        </div>
        <Button
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {isEditing ? "Save Changes" : "Edit Profile"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="text-lg">
                    <AvatarInitials name={`${profile.firstName} ${profile.lastName}`} />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {profile.firstName} {profile.lastName}
                  </h3>
                  <p className="text-gray-600">{profile.role}</p>
                  <p className="text-sm text-gray-500">{profile.company}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    disabled={!isEditing}
                    onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    disabled={!isEditing}
                    onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Information</CardTitle>
              <CardDescription>Your professional details and role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={profile.company}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((prev) => ({ ...prev, company: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={profile.role}
                    disabled={!isEditing}
                    onChange={(e) => setProfile((prev) => ({ ...prev, role: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={profile.department}
                    disabled={!isEditing}
                    onChange={(e) => setProfile((prev) => ({ ...prev, department: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={profile.location}
                  disabled={!isEditing}
                  onChange={(e) => setProfile((prev) => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Account Type</span>
                <Badge className="bg-violet-100 text-violet-800">Premium</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Two-Factor Auth</span>
                <Badge className="bg-green-100 text-green-800">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Verified</span>
                <Badge className="bg-green-100 text-green-800">Verified</Badge>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                Joined{" "}
                {new Date(profile.joinDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Suppliers Managed</span>
                <span className="font-semibold">247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Verifications Completed</span>
                <span className="font-semibold">1,834</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Reports Generated</span>
                <span className="font-semibold">89</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Compliance Rate</span>
                <span className="font-semibold text-green-600">94.2%</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="text-sm">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-gray-600">{activity.supplier}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                    {index < recentActivity.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
