"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Building2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { signUp } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating account...
        </>
      ) : (
        "Create Account"
      )}
    </Button>
  )
}

export default function SignUpForm() {
  const router = useRouter()
  const [state, formAction] = useActionState(signUp, null)

  // Handle successful signup
  useEffect(() => {
    if (state?.success) {
      // Don't redirect immediately, show success message first
      setTimeout(() => {
        router.push("/auth/login")
      }, 3000)
    }
  }, [state, router])

  // Show success message if account was created
  if (state?.success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-700">Account Created!</CardTitle>
          <CardDescription>Please check your email to verify your account before signing in.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Redirecting to login page in a few seconds...</p>
            <Link href="/auth/login" className="text-violet-600 hover:underline">
              Go to login now
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Building2 className="h-12 w-12 text-violet-600" />
        </div>
        <CardTitle className="text-2xl font-bold">Join Our Platform</CardTitle>
        <CardDescription>Create your supplier certification account</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{state.error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <Input id="firstName" name="firstName" type="text" placeholder="John" required className="w-full" />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <Input id="lastName" name="lastName" type="text" placeholder="Doe" required className="w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="you@company.com" required className="w-full" />
          </div>

          <div className="space-y-2">
            <label htmlFor="company" className="block text-sm font-medium text-gray-700">
              Company Name
            </label>
            <Input
              id="company"
              name="company"
              type="text"
              placeholder="Your Company Ltd."
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Job Title
            </label>
            <Input id="role" name="role" type="text" placeholder="Procurement Manager" required className="w-full" />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Input id="password" name="password" type="password" required className="w-full" />
            <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required className="w-full" />
          </div>

          <div className="flex items-start space-x-2">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="mt-1 h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I agree to the{" "}
              <Link href="/terms" className="text-violet-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-violet-600 hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <SubmitButton />

          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-violet-600 hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
