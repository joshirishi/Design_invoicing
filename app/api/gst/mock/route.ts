// Mock GST API endpoint for testing without real GSTIN credentials
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { action, ...params } = await request.json()

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    switch (action) {
      case "authenticate":
        return NextResponse.json({
          success: true,
          token: `mock-token-${Date.now()}`,
          message: "Mock authentication successful",
        })

      case "cash_ledger":
        return NextResponse.json({
          success: true,
          data: generateMockCashLedger(params.fromDate, params.toDate),
        })

      case "gstr1":
        return NextResponse.json({
          success: true,
          data: generateMockGSTR1(params.period),
        })

      case "gstr3b":
        return NextResponse.json({
          success: true,
          data: generateMockGSTR3B(params.period),
        })

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

function generateMockCashLedger(fromDate: string, toDate: string) {
  return [
    {
      date: "2024-01-15",
      description: "Electronic Cash Ledger - Payment via Challan PMT-2024-001",
      debitAmount: 0,
      creditAmount: 85000,
      balance: 85000,
      transactionId: "PMT202401150001",
      period: "012024",
    },
    {
      date: "2024-01-20",
      description: "GSTR-3B Filing - Tax Liability (CGST)",
      debitAmount: 38000,
      creditAmount: 0,
      balance: 47000,
      transactionId: "LBL202401200001",
      period: "012024",
    },
    {
      date: "2024-01-20",
      description: "GSTR-3B Filing - Tax Liability (SGST)",
      debitAmount: 38000,
      creditAmount: 0,
      balance: 9000,
      transactionId: "LBL202401200002",
      period: "012024",
    },
    {
      date: "2024-02-15",
      description: "Electronic Cash Ledger - Payment via Challan PMT-2024-002",
      debitAmount: 0,
      creditAmount: 95000,
      balance: 104000,
      transactionId: "PMT202402150001",
      period: "022024",
    },
  ]
}

function generateMockGSTR1(period: string) {
  return {
    period,
    gstin: "27AGSPJ2168A1ZF",
    summary: {
      totalInvoices: 12,
      totalTaxableValue: 850000,
      totalCGST: 76500,
      totalSGST: 76500,
      totalIGST: 0,
      totalInvoiceValue: 1003000,
    },
    b2b: [
      {
        ctin: "27AHQPA1234A1Z5",
        tradeName: "ABC Enterprises Pvt Ltd",
        invoices: [
          {
            inum: "INV-2024-001",
            idt: "2024-01-10",
            val: 118000,
            pos: "27",
            rchrg: "N",
            inv_typ: "R",
            items: [
              {
                num: 1,
                itemDetails: {
                  txval: 100000,
                  rt: 18,
                  iamt: 0,
                  camt: 9000,
                  samt: 9000,
                },
              },
            ],
          },
          {
            inum: "INV-2024-002",
            idt: "2024-01-15",
            val: 59000,
            pos: "27",
            rchrg: "N",
            inv_typ: "R",
            items: [
              {
                num: 1,
                itemDetails: {
                  txval: 50000,
                  rt: 18,
                  iamt: 0,
                  camt: 4500,
                  samt: 4500,
                },
              },
            ],
          },
        ],
      },
      {
        ctin: "29BBBFF5679L1Z8",
        tradeName: "XYZ Solutions Ltd",
        invoices: [
          {
            inum: "INV-2024-003",
            idt: "2024-01-20",
            val: 236000,
            pos: "29",
            rchrg: "N",
            inv_typ: "R",
            items: [
              {
                num: 1,
                itemDetails: {
                  txval: 200000,
                  rt: 18,
                  iamt: 0,
                  camt: 18000,
                  samt: 18000,
                },
              },
            ],
          },
        ],
      },
    ],
  }
}

function generateMockGSTR3B(period: string) {
  return {
    period,
    gstin: "27AGSPJ2168A1ZF",
    summary: {
      outwardSupplies: {
        taxableValue: 850000,
        integratedTax: 0,
        centralTax: 76500,
        stateTax: 76500,
        cess: 0,
        totalTax: 153000,
      },
      inwardSupplies: {
        taxableValue: 120000,
        integratedTax: 0,
        centralTax: 10800,
        stateTax: 10800,
        cess: 0,
        totalTax: 21600,
      },
      netTax: {
        integratedTax: 0,
        centralTax: 65700,
        stateTax: 65700,
        cess: 0,
        totalPayable: 131400,
      },
      interestLatePayment: {
        integratedTax: 0,
        centralTax: 0,
        stateTax: 0,
        cess: 0,
      },
    },
    filingStatus: "Filed",
    filingDate: "2024-02-18",
  }
}
