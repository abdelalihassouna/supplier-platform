import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { db } from "@/lib/database/postgresql"

// GET - Fetch user profile
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get("user_id")?.value

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile data
    const result = await db.query(`
      SELECT 
        u.id,
        u.email,
        u.email_confirmed,
        u.created_at,
        p.full_name,
        p.role,
        p.department,
        p.phone,
        p.avatar_url
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.id
      WHERE u.id = $1
    `, [userId])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = result.rows[0]
    
    // Parse full name into first and last name
    const nameParts = user.full_name?.split(" ") || ["", ""]
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(" ") || ""

    const profile = {
      id: user.id,
      email: user.email,
      firstName,
      lastName,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
      department: user.department,
      avatarUrl: user.avatar_url,
      emailConfirmed: user.email_confirmed,
      joinDate: user.created_at,
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get("user_id")?.value

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, phone, role, department } = body

    // Validation
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 })
    }

    const fullName = `${firstName} ${lastName}`.trim()

    // Update user profile in transaction
    await db.transaction(async (client) => {
      // Check if profile exists
      const existingProfile = await client.query(
        "SELECT id FROM user_profiles WHERE id = $1",
        [userId]
      )

      if (existingProfile.rows.length === 0) {
        // Create profile if it doesn't exist
        await client.query(`
          INSERT INTO user_profiles (id, email, full_name, role, department, phone)
          SELECT $1, email, $2, $3, $4, $5
          FROM users WHERE id = $1
        `, [userId, fullName, role || 'user', department, phone])
      } else {
        // Update existing profile
        await client.query(`
          UPDATE user_profiles 
          SET full_name = $2, role = $3, department = $4, phone = $5, updated_at = NOW()
          WHERE id = $1
        `, [userId, fullName, role || 'user', department, phone])
      }
    })

    return NextResponse.json({ success: true, message: "Profile updated successfully" })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
