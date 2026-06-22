// POST /api/categorize/learn
// Called when a user manually changes a transaction's category.
// Extracts a keyword from the description and adds it to the org's rule set.
import { sql } from "@/lib/db"
import { learnFromCorrection } from "@/lib/categorize"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { transaction_id, description, category, org_id = 1 } = await req.json()

    if (!description || !category) {
      return NextResponse.json({ error: "description and category are required" }, { status: 400 })
    }

    // Persist the category on the transaction
    if (transaction_id) {
      await sql`
        UPDATE bank_transactions
        SET category = ${category}, category_source = 'user'
        WHERE id = ${transaction_id}
      `
    }

    // Learn: add keyword from this description to the org's rule set
    await learnFromCorrection(org_id, description, category)

    return NextResponse.json({ success: true, message: `Learned: "${category}" for future matches` })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
