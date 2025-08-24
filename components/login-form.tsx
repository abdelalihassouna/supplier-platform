"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, Lock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { signIn } from "@/lib/actions"

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
          Signing in...
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  )
}

export default function LoginForm() {
  const router = useRouter()
  const [state, formAction] = useActionState(signIn, null)

  // Handle successful login by redirecting
  useEffect(() => {
    if (state?.success) {
      router.push("/")
    }
  }, [state, router])

  return (
    <div className="group relative p-[2px] rounded-2xl bg-[linear-gradient(120deg,#00A7A7,#003862,#00A7A7)] bg-[length:200%_200%] animate-[gradientShift_12s_ease_infinite] shadow-[0_10px_30px_rgba(0,56,98,0.25)]">
      <Card className="relative w-full max-w-[94vw] sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-[1100px] md:min-w-[680px] lg:min-w-[900px] rounded-2xl overflow-hidden bg-gradient-to-br from-white via-white to-white/95 border border-white/80 text-slate-900 shadow-2xl transition-transform duration-500 animate-in fade-in-0 zoom-in-95 group-hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-[#00A7A7]/40">
      <CardHeader className="text-center md:hidden">
        <div className="flex justify-center mb-4">
          <img src="/favicon.ico" alt="Pizzarotti VAI logo" width="56" height="56" className="drop-shadow-[0_4px_12px_rgba(0,167,167,0.45)]" />
        </div>
        <CardTitle className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-2">
          Pizzarotti
          <Image src="/logo-extended1.png" alt="VAI logo" width={110} height={28} className="h-7 w-auto" />
        </CardTitle>
        <CardDescription className="text-base text-slate-600">Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-0 overflow-hidden h-full">
        <div className="md:grid md:grid-cols-[3fr_2fr] items-stretch h-full">
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <div className="hidden md:block text-center mb-8">
              <div className="flex justify-center mb-4">
                <img src="/favicon.ico" alt="Pizzarotti VAI logo" width="64" height="64" className="drop-shadow-[0_4px_12px_rgba(0,167,167,0.45)]" />
              </div>
              <CardTitle className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center justify-center gap-3">
                Pizzarotti
                <Image src="/logo-extended1.png" alt="VAI logo" width={140} height={36} className="h-9 w-auto" />
              </CardTitle>
              <CardDescription className="text-base md:text-lg text-slate-600">Sign in to your account</CardDescription>
            </div>
            <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm md:text-base font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                className="w-full h-12 md:h-14 bg-white border-slate-200 text-slate-900 placeholder-slate-500 shadow-sm focus-visible:ring-2 focus-visible:ring-[#00A7A7] focus-visible:outline-none text-base md:text-lg pl-10 pr-4"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm md:text-base font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="w-full h-12 md:h-14 bg-white border-slate-200 text-slate-900 placeholder-slate-500 shadow-sm focus-visible:ring-2 focus-visible:ring-[#00A7A7] focus-visible:outline-none text-base md:text-lg pl-10 pr-4"
              />
            </div>
          </div>

          <SubmitButton />

          <div className="text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link href="/auth/sign-up" className="text-[#00A7A7] hover:text-[#003862] underline-offset-4 hover:underline transition-colors">
              Sign up
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
