"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Circle, ArrowRight, ArrowLeft, Building, Users, Settings, Rocket } from "lucide-react"

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    teamSize: "",
    role: "",
    goals: [] as string[],
    integrations: [] as string[],
  })

  const steps = [
    {
      id: "welcome",
      title: "Welcome to CertifyPro",
      description: "Let's get you set up with your supplier certification platform",
      icon: Rocket,
    },
    {
      id: "company",
      title: "Company Information",
      description: "Tell us about your organization",
      icon: Building,
    },
    {
      id: "team",
      title: "Team Setup",
      description: "Configure your team and roles",
      icon: Users,
    },
    {
      id: "integrations",
      title: "Integrations",
      description: "Connect your existing systems",
      icon: Settings,
    },
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleGoalToggle = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal) ? prev.goals.filter((g) => g !== goal) : [...prev.goals, goal],
    }))
  }

  const handleIntegrationToggle = (integration: string) => {
    setFormData((prev) => ({
      ...prev,
      integrations: prev.integrations.includes(integration)
        ? prev.integrations.filter((i) => i !== integration)
        : [...prev.integrations, integration],
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="text-2xl font-bold text-violet-600">CertifyPro</div>
          </div>
          <Progress value={progress} className="w-full max-w-md mx-auto mb-4" />
          <p className="text-sm text-gray-600">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isCompleted = index < currentStep
              const isCurrent = index === currentStep

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isCompleted
                        ? "bg-violet-600 border-violet-600 text-white"
                        : isCurrent
                          ? "border-violet-600 text-violet-600 bg-white"
                          : "border-gray-300 text-gray-400 bg-white"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 ml-4 ${isCompleted ? "bg-violet-600" : "bg-gray-300"}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
            <CardDescription className="text-lg">{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Welcome Step */}
            {currentStep === 0 && (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto bg-violet-100 rounded-full flex items-center justify-center">
                  <Rocket className="w-12 h-12 text-violet-600" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Welcome to the future of supplier certification</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    CertifyPro streamlines your supplier verification process with automated compliance checking,
                    real-time monitoring, and comprehensive reporting for Italian regulatory requirements.
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <p className="text-sm font-medium">Automated Verification</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
                        <Settings className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium">Easy Integration</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
                        <Building className="w-6 h-6 text-purple-600" />
                      </div>
                      <p className="text-sm font-medium">Compliance Ready</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Company Information Step */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Enter your company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.industry}
                    onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                  >
                    <option value="">Select your industry</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="construction">Construction</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="retail">Retail</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team Size</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.teamSize}
                    onChange={(e) => setFormData((prev) => ({ ...prev, teamSize: e.target.value }))}
                  >
                    <option value="">Select team size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-1000">201-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Your Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                    placeholder="e.g., Procurement Manager, Supply Chain Director"
                  />
                </div>
              </div>
            )}

            {/* Team Setup Step */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">What are your main goals with CertifyPro?</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      "Automate supplier verification",
                      "Ensure regulatory compliance",
                      "Reduce manual processes",
                      "Improve supplier visibility",
                      "Streamline procurement",
                      "Generate compliance reports",
                    ].map((goal) => (
                      <div
                        key={goal}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.goals.includes(goal)
                            ? "border-violet-600 bg-violet-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => handleGoalToggle(goal)}
                      >
                        <div className="flex items-center space-x-2">
                          {formData.goals.includes(goal) ? (
                            <CheckCircle className="w-5 h-5 text-violet-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="text-sm">{goal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Team Members</h3>
                  <p className="text-sm text-gray-600 mb-4">You can invite team members after completing setup</p>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">You (Admin)</p>
                        <p className="text-sm text-gray-600">{formData.role || "Team Lead"}</p>
                      </div>
                      <Badge>Owner</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations Step */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Connect Your Systems</h3>
                  <p className="text-gray-600 mb-4">Select the systems you'd like to integrate with CertifyPro</p>

                  <div className="space-y-3">
                    {[
                      { name: "Jaggaer", description: "Supplier management platform", recommended: true },
                      {
                        name: "Italian Government APIs",
                        description: "DURC, SOA, and compliance verification",
                        recommended: true,
                      },
                      { name: "SAP Ariba", description: "Procurement and sourcing platform", recommended: false },
                      {
                        name: "Oracle Procurement",
                        description: "Enterprise procurement solution",
                        recommended: false,
                      },
                      { name: "Email Service", description: "Notification delivery system", recommended: true },
                    ].map((integration) => (
                      <div
                        key={integration.name}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.integrations.includes(integration.name)
                            ? "border-violet-600 bg-violet-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => handleIntegrationToggle(integration.name)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {formData.integrations.includes(integration.name) ? (
                              <CheckCircle className="w-5 h-5 text-violet-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{integration.name}</span>
                                {integration.recommended && (
                                  <Badge variant="outline" className="text-xs">
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{integration.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <h4 className="font-medium text-blue-800">Setup Later</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Don't worry! You can configure these integrations anytime from the Settings page.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8 max-w-2xl mx-auto">
          <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => (window.location.href = "/")}>
              Complete Setup
              <Rocket className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
