import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // First, update the profile with Rishikesh's actual business details
    await sql`
      UPDATE profiles SET
        business_name = 'RISHIKESH JOSHI',
        email = 'rishikesh@maitridesigns.com',
        phone = '+91-8275066689',
        address = 'Plot No-1, Rajiv Gandhi IT Park, Phase 1, Hinjewadi',
        city = 'Pune',
        state = 'Maharashtra',
        postal_code = '411057',
        country = 'India',
        tax_id = '27AGSPJ2168A1ZF',
        gstin = '27AGSPJ2168A1ZF',
        pan = 'AGSPJ2168A',
        bank_name = 'ICICI Bank',
        bank_account = '056901504485',
        bank_ifsc = 'ICIC0000569'
      WHERE id = (SELECT id FROM profiles LIMIT 1)
    `

    // Create clients with GSTIN
    const clients = [
      {
        name: 'Terabyte Technologies Pvt. Ltd.',
        email: 'vivek.goyal@terabyte.com',
        phone: '',
        address: 'No.1326, P.V.R & L.M.R BLG, 24th Main Road, Sector 2, HSR Layout',
        city: 'Bangalore',
        state: 'Karnataka',
        postal_code: '560102',
        country: 'India',
        gstin: '29AAKCT0628A1ZJ'
      },
      {
        name: 'Infinity Labs Limited',
        email: 'soourabh@infinitylabs.com',
        phone: '',
        address: '6TH FLOOR, C WING, OFFICE NO 608/609, TEERTH TECHNOSPACE, NEXT TO MERCEDES BENZ SHOWROOM, BANGALORE-MUMBAI HIGH WAY, BANER',
        city: 'Pune',
        state: 'Maharashtra',
        postal_code: '411045',
        country: 'India',
        gstin: '27AAFCI3574B1ZQ'
      },
      {
        name: 'Scoredata Inc.',
        email: 'vasudev@scoredata.com',
        phone: '',
        address: '230 California Ave, Suite 100',
        city: 'Palo Alto',
        state: 'CA',
        postal_code: '94306',
        country: 'USA',
        gstin: ''
      },
      {
        name: 'Joulesstowatts Business Solutions Pvt. Ltd.',
        email: 'accounts@joulesstowatts.com',
        phone: '',
        address: '3RD FLOOR, VASWANI PRESIDIO, PANATHUR MAIN ROAD, OFF OUTER RING ROAD',
        city: 'Bengaluru',
        state: 'Karnataka',
        postal_code: '560103',
        country: 'India',
        gstin: '29AADCJ4029L1ZA'
      }
    ]

    // Insert clients and get their IDs
    const clientIds: Record<string, number> = {}
    
    for (const client of clients) {
      // Check if client already exists
      const existing = await sql`SELECT id FROM clients WHERE name = ${client.name} LIMIT 1`
      
      if (existing.length > 0) {
        clientIds[client.name] = existing[0].id
      } else {
        const result = await sql`
          INSERT INTO clients (name, email, phone, address, city, state, postal_code, country, gstin)
          VALUES (${client.name}, ${client.email}, ${client.phone}, ${client.address}, ${client.city}, ${client.state}, ${client.postal_code}, ${client.country}, ${client.gstin})
          RETURNING id
        `
        if (result.length > 0) {
          clientIds[client.name] = result[0].id
        }
      }
    }

    // Define invoices from the PDF with tax_rate
    const invoices = [
      {
        invoice_number: 'RISHI-2324-07',
        client_name: 'Terabyte Technologies Pvt. Ltd.',
        issue_date: '2023-12-31',
        due_date: '2024-01-07',
        items: [{ description: 'UX Consultancy for Terra Game Platform', sac: '998314', quantity: 1, rate: 250000 }],
        subtotal: 250000,
        tax_rate: 18,
        tax: 45000,
        total: 295000,
        status: 'paid'
      },
      {
        invoice_number: 'RISHI-2324-08',
        client_name: 'Terabyte Technologies Pvt. Ltd.',
        issue_date: '2024-01-31',
        due_date: '2024-02-07',
        items: [{ description: 'UX Consultancy for Terra Game Platform', sac: '998314', quantity: 1, rate: 234000 }],
        subtotal: 234000,
        tax_rate: 18,
        tax: 42120,
        total: 276120,
        status: 'paid'
      },
      {
        invoice_number: 'RISHI-2425-01',
        client_name: 'Infinity Labs Limited',
        issue_date: '2024-09-23',
        due_date: '2024-09-30',
        items: [{ description: 'PPT Creation for Automanix - 27 pages', sac: '998314', quantity: 1, rate: 27000 }],
        subtotal: 27000,
        tax_rate: 18,
        tax: 4860,
        total: 31860,
        status: 'paid'
      },
      {
        invoice_number: 'RISHI-2425-02P',
        client_name: 'Scoredata Inc.',
        issue_date: '2024-09-23',
        due_date: '2024-09-30',
        items: [{ description: 'UX and UI Design for GenAI base ChatUI', sac: '998314', quantity: 1, rate: 62500 }],
        subtotal: 62500,
        tax_rate: 0,
        tax: 0,
        total: 62500,
        status: 'sent',
        notes: 'USD $750 - Export invoice, no GST applicable'
      },
      {
        invoice_number: 'RISHI-2425-03',
        client_name: 'Joulesstowatts Business Solutions Pvt. Ltd.',
        issue_date: '2024-10-01',
        due_date: '2024-10-08',
        items: [{ description: 'Payment For 2 Sep 2024 to 30th Sep, 2024', hsn: '998314', quantity: 1, rate: 287583 }],
        subtotal: 287583,
        tax_rate: 18,
        tax: 51764,
        total: 339347,
        status: 'paid'
      },
      {
        invoice_number: 'RISHI-2425-04',
        client_name: 'Joulesstowatts Business Solutions Pvt. Ltd.',
        issue_date: '2024-10-30',
        due_date: '2024-11-06',
        items: [{ description: 'Payment For 1 Oct 2024 to 31 Oct 2024', hsn: '998314', quantity: 1, rate: 292702 }],
        subtotal: 292702,
        tax_rate: 18,
        tax: 52686,
        total: 345388,
        status: 'paid'
      },
      {
        invoice_number: 'RISHI-2425-05',
        client_name: 'Joulesstowatts Business Solutions Pvt. Ltd.',
        issue_date: '2024-12-02',
        due_date: '2024-12-09',
        items: [{ description: 'Payment For 1 Nov 2024 to 30 Nov 2024', hsn: '998314', quantity: 1, rate: 277667 }],
        subtotal: 277667,
        tax_rate: 18,
        tax: 49980,
        total: 327647,
        status: 'paid'
      },
      {
        invoice_number: 'RISHI-2425-06',
        client_name: 'Joulesstowatts Business Solutions Pvt. Ltd.',
        issue_date: '2025-01-03',
        due_date: '2025-01-10',
        items: [{ description: 'Payment For 1 Dec 2024 to 31 Dec 2024', hsn: '998314', quantity: 1, rate: 278307 }],
        subtotal: 278307,
        tax_rate: 18,
        tax: 50095,
        total: 328402,
        status: 'sent'
      },
      {
        invoice_number: 'RISHI-2425-07',
        client_name: 'Scoredata Inc.',
        issue_date: '2024-11-01',
        due_date: '2024-11-08',
        items: [{ description: 'UX and UI Design for GenAI base ChatUI - RoKhanna', sac: '998314', quantity: 1, rate: 62500 }],
        subtotal: 62500,
        tax_rate: 0,
        tax: 0,
        total: 62500,
        status: 'paid',
        notes: 'USD $750 - Export invoice, no GST applicable'
      }
    ]

    // Insert invoices
    let insertedCount = 0
    for (const invoice of invoices) {
      const clientId = clientIds[invoice.client_name]
      if (!clientId) {
        console.log(`Client not found for invoice ${invoice.invoice_number}: ${invoice.client_name}`)
        continue
      }

      // Check if invoice already exists
      const existing = await sql`SELECT id FROM invoices WHERE invoice_number = ${invoice.invoice_number} LIMIT 1`
      if (existing.length > 0) {
        continue // Skip if already exists
      }

      try {
        await sql`
          INSERT INTO invoices (
            invoice_number, client_id, issue_date, due_date, items, 
            subtotal, tax_rate, tax, total, status, notes
          )
          VALUES (
            ${invoice.invoice_number}, 
            ${clientId}, 
            ${invoice.issue_date}, 
            ${invoice.due_date}, 
            ${JSON.stringify(invoice.items)}, 
            ${invoice.subtotal}, 
            ${invoice.tax_rate},
            ${invoice.tax}, 
            ${invoice.total}, 
            ${invoice.status},
            ${invoice.notes || ''}
          )
        `
        insertedCount++
      } catch (err) {
        console.log(`Error inserting invoice ${invoice.invoice_number}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${Object.keys(clientIds).length} clients and ${insertedCount} invoices from your Figma data`,
      clients: Object.keys(clientIds),
      invoiceCount: insertedCount
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
