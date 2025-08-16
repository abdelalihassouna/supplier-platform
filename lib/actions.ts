"use server"

// Auth is disabled in local PostgreSQL mode.
export async function signIn(_prevState: any, _formData: FormData) {
  return { error: "Authentication is disabled in local mode." }
}

export async function signUp(_prevState: any, _formData: FormData) {
  return { error: "User registration is disabled in local mode." }
}

export async function signOut() {
  return { success: true }
}
