"use client"
import { useState } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import type { TemplateConfig, CustomField } from "@/lib/template-defaults"

interface Props {
  config: TemplateConfig
  onChange: (patch: Partial<TemplateConfig>) => void
}

type FieldKey = keyof Omit<TemplateConfig["fields"], "custom">

const FIELD_DEFS: Array<{
  key: FieldKey
  label: string
  description: string
  hasCustomLabel?: boolean
}> = [
  { key: "senderAddress", label: "Sender Address",  description: "Your business address on the invoice",  hasCustomLabel: true  },
  { key: "senderPhone",   label: "Sender Phone",    description: "Your phone number",                     hasCustomLabel: true  },
  { key: "clientPhone",   label: "Client Phone",    description: "Client's phone number",                 hasCustomLabel: false },
  { key: "clientGstin",   label: "Client GSTIN",    description: "Client's GST registration number",      hasCustomLabel: true  },
  { key: "hsnCode",       label: "HSN/SAC Code",    description: "Harmonised System of Nomenclature code",hasCustomLabel: true  },
  { key: "serviceDate",   label: "Service Date",       description: "Date the service was provided",              hasCustomLabel: true  },
  { key: "cgstSgst",      label: "CGST + SGST rows",   description: "Show CGST and SGST breakdown in totals",     hasCustomLabel: false },
  { key: "bankDetails",   label: "Bank Details",        description: "Bank account details for payment",           hasCustomLabel: false },
  { key: "terms",         label: "Terms & Conditions",  description: "Payment terms and legal notes",              hasCustomLabel: false },
  { key: "signature",     label: "Signature Block", description: "Authorised signatory line",             hasCustomLabel: false },
  { key: "logo",          label: "Company Logo",    description: "Upload and show your logo (coming soon)",hasCustomLabel: false},
]

export function TemplateFieldPanel({ config, onChange }: Props) {
  const [newLabel, setNewLabel] = useState("")
  const [newValue, setNewValue] = useState("")

  function setField(key: FieldKey, patch: Partial<{ show: boolean; label: string }>) {
    onChange({
      fields: {
        ...config.fields,
        [key]: { ...config.fields[key], ...patch },
      },
    })
  }

  function addCustomField() {
    if (!newLabel.trim()) return
    const custom: CustomField[] = [
      ...config.fields.custom,
      { id: Date.now().toString(), label: newLabel.trim(), value: newValue.trim(), show: true },
    ]
    onChange({ fields: { ...config.fields, custom } })
    setNewLabel("")
    setNewValue("")
  }

  function removeCustomField(id: string) {
    onChange({
      fields: {
        ...config.fields,
        custom: config.fields.custom.filter((c) => c.id !== id),
      },
    })
  }

  function updateCustomField(id: string, patch: Partial<CustomField>) {
    onChange({
      fields: {
        ...config.fields,
        custom: config.fields.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    })
  }

  return (
    <div className="space-y-1 text-sm">
      <p className="text-xs text-gray-400 mb-3">Toggle fields on or off. Rename labels for any field.</p>

      {/* Standard fields */}
      {FIELD_DEFS.map(({ key, label, description, hasCustomLabel }) => {
        const field = config.fields[key] as { show: boolean; label?: string }
        return (
          <div
            key={key}
            className={`group flex items-start gap-3 p-3 rounded-lg border transition-all
              ${field.show ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}
          >
            <div className="pt-0.5">
              <button
                onClick={() => setField(key, { show: !field.show })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0
                  ${field.show ? "bg-indigo-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow
                  ${field.show ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-medium text-xs ${field.show ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
              {hasCustomLabel && field.show && (
                <input
                  type="text"
                  value={field.label || ""}
                  onChange={(e) => setField(key, { label: e.target.value })}
                  placeholder={`Custom label (default: ${label})`}
                  className="mt-1.5 w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              )}
            </div>
          </div>
        )
      })}

      {/* Custom fields */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Custom Fields</span>
          <span className="text-xs text-gray-400">{config.fields.custom.length} added</span>
        </div>

        {config.fields.custom.map((cf) => (
          <div key={cf.id} className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 bg-white mb-2">
            <GripVertical className="w-3.5 h-3.5 text-gray-300 mt-1.5 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <input
                type="text"
                value={cf.label}
                onChange={(e) => updateCustomField(cf.id, { label: e.target.value })}
                placeholder="Field label"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-medium"
              />
              <input
                type="text"
                value={cf.value}
                onChange={(e) => updateCustomField(cf.id, { value: e.target.value })}
                placeholder="Field value (shown on invoice)"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
              />
            </div>
            <div className="flex items-center gap-1 pt-1">
              <button
                onClick={() => updateCustomField(cf.id, { show: !cf.show })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0
                  ${cf.show ? "bg-indigo-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow
                  ${cf.show ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <button
                onClick={() => removeCustomField(cf.id)}
                className="p-1 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Add new custom field */}
        <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2 mt-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New field label (e.g. Project Code)"
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Default value (optional)"
            className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            onClick={addCustomField}
            disabled={!newLabel.trim()}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Add field
          </button>
        </div>
      </div>
    </div>
  )
}
