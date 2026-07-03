import { createServerClient } from "@/lib/supabase-auth"
import { getCurrentOrgId } from "@/lib/get-org"
import { NextResponse } from "next/server"
import type { TemplateConfig } from "@/lib/template-defaults"

export const dynamic = "force-dynamic"

// GET /api/invoice-templates         — list all saved templates for org
// GET /api/invoice-templates?active  — return only the default template config
export async function GET(req: Request) {
  try {
    const supabase = createServerClient()
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(req.url)

    if (searchParams.has("active")) {
      const { data, error } = await supabase
        .from("invoice_templates")
        .select("config")
        .eq("org_id", orgId)
        .eq("is_default", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") throw error
      return NextResponse.json(data?.config ?? null)
    }

    const { data, error } = await supabase
      .from("invoice_templates")
      .select("id, name, is_default, config, created_at, updated_at")
      .eq("org_id", orgId)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (e) {
    console.error("[GET /api/invoice-templates]", String(e))
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST /api/invoice-templates — save a new template (optionally set as default)
export async function POST(req: Request) {
  try {
    const supabase = createServerClient()
    const orgId = await getCurrentOrgId()
    const { name, config, is_default = false }: { name: string; config: TemplateConfig; is_default: boolean } =
      await req.json()

    if (!name || !config) {
      return NextResponse.json({ error: "name and config are required" }, { status: 400 })
    }

    // Clear existing defaults if this will become the new default
    if (is_default) {
      const { error: clearErr } = await supabase
        .from("invoice_templates")
        .update({ is_default: false })
        .eq("org_id", orgId)

      if (clearErr) throw clearErr
    }

    const { data, error } = await supabase
      .from("invoice_templates")
      .insert({ org_id: orgId, name, is_default, config })
      .select("id")
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (e) {
    console.error("[POST /api/invoice-templates]", String(e))
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PUT /api/invoice-templates — update an existing template by id
export async function PUT(req: Request) {
  try {
    const supabase = createServerClient()
    const orgId = await getCurrentOrgId()
    const { id, name, config, is_default }: { id: number; name?: string; config?: TemplateConfig; is_default?: boolean } =
      await req.json()

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    if (is_default) {
      const { error: clearErr } = await supabase
        .from("invoice_templates")
        .update({ is_default: false })
        .eq("org_id", orgId)

      if (clearErr) throw clearErr
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) patch.name = name
    if (config !== undefined) patch.config = config
    if (is_default !== undefined) patch.is_default = is_default

    const { error } = await supabase
      .from("invoice_templates")
      .update(patch)
      .eq("id", id)
      .eq("org_id", orgId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[PUT /api/invoice-templates]", String(e))
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE /api/invoice-templates?id=X
export async function DELETE(req: Request) {
  try {
    const supabase = createServerClient()
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const { error } = await supabase
      .from("invoice_templates")
      .delete()
      .eq("id", Number(id))
      .eq("org_id", orgId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[DELETE /api/invoice-templates]", String(e))
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
