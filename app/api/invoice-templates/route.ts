import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { NextResponse } from "next/server"
import type { TemplateConfig } from "@/lib/template-defaults"

export const dynamic = "force-dynamic"

// GET /api/invoice-templates         — list all saved templates for org
// GET /api/invoice-templates?active  — return only the default template config
export async function GET(req: Request) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(req.url)

    if (searchParams.has("active")) {
      const rows = await sql`
        SELECT config FROM invoice_templates
        WHERE org_id = ${orgId} AND is_default = TRUE
        ORDER BY updated_at DESC LIMIT 1
      `
      return NextResponse.json(rows[0]?.config ?? null)
    }

    const rows = await sql`
      SELECT id, name, is_default, config, created_at, updated_at
      FROM invoice_templates
      WHERE org_id = ${orgId}
      ORDER BY is_default DESC, updated_at DESC
    `
    return NextResponse.json(rows)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/invoice-templates — save a new template (and optionally set as default)
export async function POST(req: Request) {
  try {
    const orgId = await getCurrentOrgId()
    const { name, config, is_default = false }: { name: string; config: TemplateConfig; is_default: boolean } =
      await req.json()

    if (!name || !config) {
      return NextResponse.json({ error: "name and config are required" }, { status: 400 })
    }

    // If this will be default, clear any existing defaults first
    if (is_default) {
      await sql`UPDATE invoice_templates SET is_default = FALSE WHERE org_id = ${orgId}`
    }

    const configJson = JSON.stringify(config)
    const rows = await sql`
      INSERT INTO invoice_templates (org_id, name, is_default, config)
      VALUES (${orgId}, ${name}, ${is_default}, ${configJson}::jsonb)
      RETURNING id, name, is_default, config, created_at
    `
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error("[POST /api/invoice-templates]", String(e))
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PUT /api/invoice-templates — update an existing template by id
export async function PUT(req: Request) {
  try {
    const orgId = await getCurrentOrgId()
    const { id, name, config, is_default }: { id: number; name?: string; config?: TemplateConfig; is_default?: boolean } =
      await req.json()

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    if (is_default) {
      await sql`UPDATE invoice_templates SET is_default = FALSE WHERE org_id = ${orgId}`
    }

    const configJson = config ? JSON.stringify(config) : null
    const rows = await sql`
      UPDATE invoice_templates
      SET
        name       = COALESCE(${name ?? null}, name),
        config     = COALESCE(${configJson}::jsonb, config),
        is_default = COALESCE(${is_default ?? null}, is_default),
        updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
      RETURNING id, name, is_default, config, updated_at
    `
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (e) {
    console.error("[PUT /api/invoice-templates]", String(e))
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE /api/invoice-templates?id=X
export async function DELETE(req: Request) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    await sql`DELETE FROM invoice_templates WHERE id = ${id} AND org_id = ${orgId}`
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
