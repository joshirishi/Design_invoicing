import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { createServerClient } from "@/lib/supabase-auth"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

const BUCKET = "gst-documents"
const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = ["application/pdf", "application/json", "text/csv", "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]

// GET /api/gst/documents — list all documents for the org with computed status
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const today = new Date().toISOString().split("T")[0]

    const docs = await sql`
      SELECT id, doc_type, period, file_name, file_url, status, due_date, uploaded_at, notes, created_at
      FROM gst_documents
      WHERE org_id = ${orgId}
      ORDER BY created_at DESC
    `

    // Compute live status: if due_date has passed and still pending → overdue
    const withStatus = docs.map((d) => ({
      ...d,
      status: d.status === "uploaded"
        ? "uploaded"
        : d.due_date && d.due_date < today
          ? "overdue"
          : "pending",
    }))

    return NextResponse.json(withStatus)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/gst/documents — upload a GST document file
export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const formData = await request.formData()

    const file = formData.get("file") as File | null
    const docType = formData.get("doc_type") as string
    const period = formData.get("period") as string | null
    const dueDate = formData.get("due_date") as string | null
    const notes = formData.get("notes") as string | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (!docType) return NextResponse.json({ error: "doc_type is required" }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|json|csv|xls|xlsx)$/i)) {
      return NextResponse.json({ error: "Only PDF, JSON, CSV, or Excel files are allowed" }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === BUCKET)
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET, { public: false })
    }

    // Build path: org-{id}/{docType}/{period or 'all'}/{timestamp}_{filename}
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const periodSegment = period || "all"
    const storagePath = `org-${orgId}/${docType}/${periodSegment}/${Date.now()}_${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    // Get a signed URL (valid 7 days) since bucket is private
    const { data: signedData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

    const fileUrl = signedData?.signedUrl || ""

    const inserted = await sql`
      INSERT INTO gst_documents (
        org_id, doc_type, period, file_name, file_url, file_path,
        status, due_date, uploaded_at, notes
      ) VALUES (
        ${orgId}, ${docType}, ${period || null}, ${file.name}, ${fileUrl}, ${storagePath},
        'uploaded', ${dueDate || null}, NOW(), ${notes || null}
      )
      RETURNING id, doc_type, period, file_name, file_url, status, due_date, uploaded_at
    `

    return NextResponse.json(inserted[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/gst/documents?id=X — delete a document record and its stored file
export async function DELETE(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    // Verify ownership + get file path
    const doc = await sql`
      SELECT id, file_path FROM gst_documents WHERE id = ${id} AND org_id = ${orgId}
    `
    if (doc.length === 0) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    // Remove from storage if a path exists
    if (doc[0].file_path) {
      const supabase = createServerClient()
      await supabase.storage.from(BUCKET).remove([doc[0].file_path])
    }

    await sql`DELETE FROM gst_documents WHERE id = ${id} AND org_id = ${orgId}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
