export function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ]

  if (num === 0) return "Zero"

  function convertLessThanThousand(n: number): string {
    if (n === 0) return ""

    if (n < 10) return ones[n]

    if (n < 20) return teens[n - 10]

    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
    }

    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "")
  }

  function convertIndianNumbering(n: number): string {
    if (n < 1000) return convertLessThanThousand(n)

    if (n < 100000) {
      const thousands = Math.floor(n / 1000)
      const remainder = n % 1000
      return (
        convertLessThanThousand(thousands) +
        " Thousand" +
        (remainder !== 0 ? " " + convertLessThanThousand(remainder) : "")
      )
    }

    if (n < 10000000) {
      const lakhs = Math.floor(n / 100000)
      const remainder = n % 100000
      return convertLessThanThousand(lakhs) + " Lakh" + (remainder !== 0 ? " " + convertIndianNumbering(remainder) : "")
    }

    const crores = Math.floor(n / 10000000)
    const remainder = n % 10000000
    return convertLessThanThousand(crores) + " Crore" + (remainder !== 0 ? " " + convertIndianNumbering(remainder) : "")
  }

  return convertIndianNumbering(Math.floor(num)) + " Only"
}
