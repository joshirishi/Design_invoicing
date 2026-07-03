export const dynamic = "force-dynamic"

import { createServerClient } from "@/lib/supabase-auth"
import { getCurrentOrgId } from "@/lib/get-org"
import { STARTER_TEMPLATES } from "@/lib/template-defaults"
import TemplatesPageClient from "@/components/templates-page-client"
import type { TemplateConfig } from "@/lib/template-defaults"

export default async function TemplatesPage() {
  const supabase = createServerClient()
  const orgId = await getCurrentOrgId()

  const { data } = await supabase
    .from("invoice_templates")
    .select("id, name, is_default, config, updated_at")
    .eq("org_id", orgId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })

  const saved = (data ?? []) as Array<{
    id: number
    name: string
    is_default: boolean
    config: TemplateConfig
    updated_at: string
  }>

  return (
    <TemplatesPageClient
      starters={STARTER_TEMPLATES}
      saved={saved}
    />
  )
}
