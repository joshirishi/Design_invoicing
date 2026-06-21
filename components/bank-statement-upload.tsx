"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText } from "lucide-react"
import { fetchFromAPI } from "@/lib/fetch"
import { useRouter } from "next/navigation"

export function BankStatementUpload() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

    const transactions = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",")
      const transaction: Record<string, string> = {}

      headers.forEach((header, index) => {
        transaction[header] = values[index]?.trim() || ""
      })

      transactions.push(transaction)
    }

    return transactions
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const text = await file.text()
      const transactions = parseCSV(text)

      const formattedTransactions = transactions.map((t) => ({
        transaction_date: t.date || t["transaction date"] || new Date().toISOString().split("T")[0],
        description: t.description || t.narration || t.particulars || "",
        reference_number: t.reference || t["ref no"] || t["cheque no"] || null,
        debit: t.debit ? Number.parseFloat(t.debit.replace(/[^0-9.-]/g, "")) : null,
        credit: t.credit ? Number.parseFloat(t.credit.replace(/[^0-9.-]/g, "")) : null,
        balance: t.balance ? Number.parseFloat(t.balance.replace(/[^0-9.-]/g, "")) : null,
        reconciled: false,
      }))

      await fetchFromAPI("/api/bank-transactions", {
        method: "POST",
        body: JSON.stringify({ transactions: formattedTransactions }),
      })

      setFile(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload bank statement")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Bank Statement</CardTitle>
        <CardDescription>
          Upload your bank statement in CSV format. Supported columns: Date, Description, Debit, Credit, Balance,
          Reference
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="file-upload"
              className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm">{file ? file.name : "Choose CSV file"}</span>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">CSV Format Example:</p>
            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
              Date,Description,Debit,Credit,Balance,Reference
              <br />
              01/09/2025,Payment received,0,282630,500000,TXN123
              <br />
              02/09/2025,Service charge,500,0,499500,CHG456
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
