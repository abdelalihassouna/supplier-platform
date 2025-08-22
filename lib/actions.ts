"use server"

import { db } from "@/lib/database/postgresql"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function signIn(prevState: any, formData: FormData) {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password) {
      return { error: "Email and password are required." }
    }

    // Find user in database
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email])
    const user = result.rows[0]

    if (!user) {
      return { error: "Invalid email or password." }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return { error: "Invalid email or password." }
    }

    // Create session
    const cookieStore = await cookies()
    cookieStore.set("user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return { success: true }
  } catch (error) {
    console.error("Sign in error:", error)
    return { error: "An error occurred during sign in." }
  }
}

export async function signUp(prevState: any, formData: FormData) {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const company = formData.get("company") as string
    const role = formData.get("role") as string

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return { error: "All required fields must be filled." }
    }

    if (password !== confirmPassword) {
      return { error: "Passwords do not match." }
    }

    if (password.length < 8) {
      return { error: "Password must be at least 8 characters long." }
    }

    // Check if user already exists
    const existingUser = await db.query("SELECT id FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return { error: "An account with this email already exists." }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user and profile in transaction
    await db.transaction(async (client) => {
      // Insert user
      const userResult = await client.query(
        "INSERT INTO users (email, password_hash, email_confirmed) VALUES ($1, $2, $3) RETURNING id",
        [email, passwordHash, true]
      )
      const userId = userResult.rows[0].id

      // Insert user profile
      await client.query(
        "INSERT INTO user_profiles (id, email, full_name, role, department) VALUES ($1, $2, $3, $4, $5)",
        [userId, email, `${firstName} ${lastName}`, "user", company]
      )
    })

    return { success: true }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An error occurred during registration." }
  }
}

export async function signOut() {
  try {
    const cookieStore = await cookies()
    cookieStore.set("user_id", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
    })
    return { success: true }
  } catch (error) {
    console.error("Sign out error:", error)
    return { error: "An error occurred during sign out." }
  }
}
