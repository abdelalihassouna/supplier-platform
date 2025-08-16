export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white shadow rounded p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Authentication Disabled</h1>
        <p className="text-gray-600 mb-6">
          This local build runs without Supabase. User login/sign-up are disabled.
        </p>
        <a
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          href="/"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  )
}
