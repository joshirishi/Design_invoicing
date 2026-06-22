export const dynamic = "force-dynamic"

import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { STARTER_TEMPLATES } from "@/lib/template-defaults"
import TemplatesPageClient from "@/components/templates-page-client"
import type { TemplateConfig } from "@/lib/template-defaults"

export default async function TemplatesPage() {
  const orgId = await getCurrentOrgId()

  // Load any saved templates for this org
  const saved = await sql`
    SELECT id, name, is_default, config, updated_at
    FROM invoice_templates
    WHERE org_id = ${orgId}
    ORDER BY is_default DESC, updated_at DESC
  `

  return (
    <TemplatesPageClient
      starters={STARTER_TEMPLATES}
      saved={saved as Array<{ id: number; name: string; is_default: boolean; config: TemplateConfig; updated_at: string }>}
    />
  )
}
