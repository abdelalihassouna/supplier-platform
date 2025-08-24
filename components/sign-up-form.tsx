"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, Mail, Lock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { signUp } from "@/lib/actions"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-12 md:h-14 text-base md:text-lg px-6 text-white shadow-lg transition-all focus-visible:ring-2 focus-visible:ring-[#00A7A7] disabled:opacity-70 bg-[linear-gradient(90deg,#003862,#00A7A7)] bg-[length:200%_200%] hover:brightness-105 animate-[gradientShift_8s_ease_infinite]"
    >
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
    <div className="group relative p-[2px] rounded-2xl bg-[linear-gradient(120deg,#00A7A7,#003862,#00A7A7)] bg-[length:200%_200%] animate-[gradientShift_12s_ease_infinite] shadow-[0_10px_30px_rgba(0,56,98,0.25)]">
      <Card className="relative w-full max-w-[94vw] sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-[1100px] md:min-w-[680px] lg:min-w-[900px] rounded-2xl overflow-hidden bg-gradient-to-br from-white via-white to-white/95 border border-white/80 text-slate-900 shadow-2xl transition-transform duration-500 animate-in fade-in-0 zoom-in-95 group-hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-[#00A7A7]/40">
        <CardHeader className="text-center md:hidden">
          <div className="flex justify-center mb-4">
            <img src="/favicon.ico" alt="Pizzarotti VAI logo" width="56" height="56" className="drop-shadow-[0_4px_12px_rgba(0,167,167,0.45)]" />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-2">
            Join Our Platform
          </CardTitle>
          <CardDescription className="text-base text-slate-600">Create your supplier certification account</CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-0 overflow-hidden h-full">
          <div className="md:grid md:grid-cols-[3fr_2fr] items-stretch h-full">
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <div className="hidden md:block text-center mb-8">
                <div className="flex justify-center mb-4">
                  <img src="/favicon.ico" alt="Pizzarotti VAI logo" width="64" height="64" className="drop-shadow-[0_4px_12px_rgba(0,167,167,0.45)]" />
                </div>
                <CardTitle className="text-3xl md:text-4xl font-bold text-slate-900">
                  Join Our Platform
                </CardTitle>
                <CardDescription className="text-base md:text-lg text-slate-600">Create your supplier certification account</CardDescription>
              </div>
              <form action={formAction} className="space-y-4">
                {state?.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{state.error}</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="block text-sm md:text-base font-medium text-slate-700">
                      First Name
                    </label>
                    <Input id="firstName" name="firstName" type="text" placeholder="John" required className="w-full h-12 md:h-14 bg-white border-slate-200 text-slate-900 placeholder-slate-500 shadow-sm focus-visible:ring-2 focus-visible:ring-[#00A7A7] focus-visible:outline-none text-base md:text-lg px-4" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="block text-sm md:text-base font-medium text-slate-700">
                      Last Name
                    </label>
                    <Input id="lastName" name="lastName" type="text" placeholder="Doe" required className="w-full h-12 md:h-14 bg-white border-slate-200 text-slate-900 placeholder-slate-500 shadow-sm focus-visible:ring-2 focus-visible:ring-[#00A7A7] focus-visible:outline-none text-base md:text-lg px-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm md:text-base font-medium text-slate-700">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                    <Input id="email" name="email" type="email" placeholder="you@company.com" required className="w-full h-12 md:h-14 bg-white border-slate-200 text-slate-900 placeholder-slate-500 shadow-sm focus-visible:ring-2 focus-visible:ring-[#00A7A7] focus-visible:outline-none text-base md:text-lg pl-10 pr-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="company" className="block text-sm md:text-base font-medium text-slate-700">
                    Company Name
                  </label>
                  <Input id="company" name="company" type="text" placeholder="Your Company Ltd." required className="w-full h-12 md:h-14 bg-white border-slate-200 text-slate-900 placeholder-slate-500 shadow-sm focus-visible:ring-2 focus-visible:ring-[#00A7A7] focus-visible:outline-none text-base md:text-lg px-4" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="role" className="block text-sm md:text-base font-medium text-slate-700">
                    Job Title
                  </label>
                  <Input id="role" name="role" type="text" placeholder="Procurement Manager" required className="w-full h-12 md:h-14 bg-white border-slate-200 text-slate-900 placeholder-slate-500 shadow-sm focus-visible:ring-2 focus-visible:ring-[#00A7A7] focus-visible:outline-none text-base md:text-lg px-4" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm md:text-base font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                    <Input id="password" name="password" type="password" required className="w-full h-12 md:h-14 bg-white border-slate-200 text-slate-900 placeholder-slate-500 shadow-sm focus-visible:ring-2 focus-visible:ring-[#00A7A7] focus-visible:outline-none text-base md:text-lg pl-10 pr-4" />
                  </div>
                  <p className="text-xs text-slate-500">Must be at least 8 characters long</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm md:text-base font-medium text-slate-700">
                    Confirm Password
                  </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
                      <Input id="confirmPassword" name="confirmPassword" type="password" required className="w-full h-12 md:h-14 bg-white border-slate-200 text-slate-900 placeholder-slate-500 shadow-sm focus-visible:ring-2 focus-visible:ring-[#00A7A7] focus-visible:outline-none text-base md:text-lg pl-10 pr-4" />
                    </div>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4 text-[#00A7A7] focus:ring-[#00A7A7] border-slate-300 rounded"
                  />
                  <label htmlFor="terms" className="text-sm text-slate-700">
                    I agree to the{" "}
                    <Link href="/terms" className="text-[#00A7A7] hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-[#00A7A7] hover:underline">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <SubmitButton />

                <div className="text-center text-sm text-slate-600">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-[#00A7A7] hover:text-[#003862] underline-offset-4 hover:underline transition-colors">
                    Sign in
                  </Link>
                </div>
              </form>
            </div>
            <div className="hidden md:block relative min-h-[480px] h-full overflow-hidden">
              <div className="absolute inset-0">
                <Image
                  src="/construction-site.jpg"
                  alt="Construction Site"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover object-[center_40%]"
                  priority
                />
                <div className="absolute inset-0 bg-[#008080]/30"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <h2 className="text-3xl lg:text-4xl font-bold text-white text-center">
                    Building the
                    <br className="hidden lg:block" />
                    Future
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
