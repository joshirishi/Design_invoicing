import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Check if data already exists
    const existingClients = await sql`SELECT COUNT(*) as count FROM clients`
    if (existingClients[0].count > 0) {
      return NextResponse.json({
        success: false,
        message: "Database already has data. Clear it first if you want to reseed.",
      })
    }

    // Insert sample clients
    await sql`
      INSERT INTO clients (name, email, phone, address, gst_number, created_at)
      VALUES 
        ('Tech Solutions Pvt Ltd', 'contact@techsolutions.com', '+91-9876543210', 'Bangalore, Karnataka', '29ABCDE1234F1Z5', NOW() - INTERVAL '90 days'),
        ('Digital Marketing Co', 'info@digitalmarketing.com', '+91-9876543211', 'Mumbai, Maharashtra', '27FGHIJ5678K1L9', NOW() - INTERVAL '60 days'),
        ('Retail Store LLC', 'admin@retailstore.com', '+91-9876543212', 'Delhi, NCR', '07MNOPQ9012R1S3', NOW() - INTERVAL '45 days'),
        ('Consulting Services', 'hello@consulting.com', '+91-9876543213', 'Pune, Maharashtra', '27TUVWX3456Y1Z7', NOW() - INTERVAL '30 days')
    `

    const clients = await sql`SELECT id, name FROM clients ORDER BY created_at`

    // Insert sample invoices with GST (18%)
    const invoiceData = [
      { client: clients[0].id, number: "INV-2024-001", amount: 100000, date: "90 days", status: "paid" },
      { client: clients[0].id, number: "INV-2024-002", amount: 150000, date: "75 days", status: "paid" },
      { client: clients[1].id, number: "INV-2024-003", amount: 75000, date: "60 days", status: "paid" },
      { client: clients[1].id, number: "INV-2024-004", amount: 200000, date: "45 days", status: "pending" },
      { client: clients[2].id, number: "INV-2024-005", amount: 50000, date: "30 days", status: "paid" },
      { client: clients[2].id, number: "INV-2024-006", amount: 125000, date: "20 days", status: "pending" },
      { client: clients[3].id, number: "INV-2024-007", amount: 180000, date: "15 days", status: "paid" },
      { client: clients[3].id, number: "INV-2024-008", amount: 95000, date: "5 days", status: "pending" },
    ]

    for (const inv of invoiceData) {
      const gstAmount = Math.round(inv.amount * 0.18)
      const totalAmount = inv.amount + gstAmount

      await sql`
        INSERT INTO invoices (
          invoice_number, client_id, issue_date, due_date, 
          subtotal, gst_amount, total_amount, status, notes
        )
        VALUES (
          ${inv.number},
          ${inv.client},
          NOW() - INTERVAL '${inv.date}',
          NOW() - INTERVAL '${inv.date}' + INTERVAL '30 days',
          ${inv.amount},
          ${gstAmount},
          ${totalAmount},
          ${inv.status},
          'Sample invoice for testing GST reconciliation'
        )
      `
    }

    // Insert payments for paid invoices
    const paidInvoices = await sql`
      SELECT id, total_amount, issue_date, invoice_number 
      FROM invoices 
      WHERE status = 'paid'
      ORDER BY issue_date
    `

    for (const invoice of paidInvoices) {
      await sql`
        INSERT INTO payments (invoice_id, amount, payment_date, payment_method, reference_number)
        VALUES (
          ${invoice.id},
          ${invoice.total_amount},
          ${invoice.issue_date}::timestamp + INTERVAL '10 days',
          'Bank Transfer',
          CONCAT('TXN', LPAD(${invoice.id}::text, 6, '0'))
        )
      `
    }

    // Insert bank transactions for reconciliation
    for (const invoice of paidInvoices) {
      await sql`
        INSERT INTO bank_transactions (
          transaction_date, description, amount, 
          transaction_type, reference_number, is_reconciled
        )
        VALUES (
          ${invoice.issue_date}::timestamp + INTERVAL '10 days',
          CONCAT('Payment received - ', ${invoice.invoice_number}),
          ${invoice.total_amount},
          'credit',
          CONCAT('TXN', LPAD(${invoice.id}::text, 6, '0')),
          true
        )
      `
    }

    const summary = await sql`
      SELECT 
        (SELECT COUNT(*) FROM clients) as clients,
        (SELECT COUNT(*) FROM invoices) as invoices,
        (SELECT COUNT(*) FROM payments) as payments,
        (SELECT COUNT(*) FROM bank_transactions) as transactions
    `

    return NextResponse.json({
      success: true,
      message: "Sample data created successfully",
      data: summary[0],
    })
  } catch (error) {
    console.error("Seed data error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to seed data",
      },
      { status: 500 },
    )
  }
}
