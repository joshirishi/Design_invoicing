import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const clients = await sql`SELECT * FROM clients ORDER BY name ASC`
    return NextResponse.json(clients)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, address, city, state, postal_code, country } = body

    const result = await sql`
      INSERT INTO clients (name, email, phone, address, city, state, postal_code, country)
      VALUES (${name}, ${email}, ${phone || null}, ${address || null}, ${city || null}, ${state || null}, ${postal_code || null}, ${country || null})
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, email, phone, address, city, state, postal_code, country } = body

    const result = await sql`
      UPDATE clients
      SET name = ${name}, email = ${email}, phone = ${phone}, address = ${address},
          city = ${city}, state = ${state}, postal_code = ${postal_code}, country = ${country},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 })
    }

    await sql`DELETE FROM clients WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
