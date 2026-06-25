// Handles uploading a background PNG to Supabase Storage.
// POST multipart/form-data with field "file" → returns { url }
// The bucket "template-backgrounds" must exist in Supabase Storage with public read access.

import { NextResponse } from "next/server"
import { createServerComponentClient } from "@/lib/supabase-server"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

const BUCKET = "template-backgrounds"
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]

export async function POST(req: Request) {
  try {
    const orgId = await getCurrentOrgId()
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPEG, or WEBP images are allowed" }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 })
    }

    const supabase = await createServerComponentClient()

    // Ensure the bucket exists (no-op if it already does)
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === BUCKET)
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET, { public: true })
    }

    // Build a unique storage path per org
    const ext = file.name.split(".").pop() ?? "png"
    const path = `org-${orgId}/${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({ url: publicData.publicUrl }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
