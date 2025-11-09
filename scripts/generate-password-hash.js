// Generate password hash for admin user
// Run this to get the hash for any password

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashHex
}

// Generate hash for the admin password
const password = "OYE12BABY!@"
const hash = await hashPassword(password)

console.log("Password:", password)
console.log("Hash:", hash)
console.log("\nUse this hash in the SQL script:")
console.log(hash)
