import SignUpForm from "@/components/sign-up-form"

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#003862,_#00A7A7,_#FFFFFF,_#003862)] bg-[length:300%_300%] animate-[gradientShift_18s_ease_infinite]" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-overlay bg-[radial-gradient(60rem_40rem_at_20%_10%,rgba(255,255,255,0.5),transparent),radial-gradient(50rem_40rem_at_80%_90%,rgba(255,255,255,0.35),transparent)]"
      />
      <SignUpForm />
    </div>
  )
}
