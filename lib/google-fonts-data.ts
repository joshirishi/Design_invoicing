// Top 150 Google Fonts by Popularity Rank, sourced from Design_skill_reference/data/google-fonts.csv
// Only latin-compatible fonts suitable for professional invoices are included.

export interface GoogleFont {
  family: string
  category: "Sans Serif" | "Serif" | "Display" | "Handwriting" | "Monospace"
  styles: string   // available weights e.g. "400 | 700"
  rank: number
}

export const GOOGLE_FONTS: GoogleFont[] = [
  // Rank 1-10 (most popular globally)
  { family: "Roboto",             category: "Sans Serif",  styles: "100 | 300 | 400 | 500 | 700 | 900", rank: 1  },
  { family: "Open Sans",          category: "Sans Serif",  styles: "300 | 400 | 500 | 600 | 700 | 800", rank: 2  },
  { family: "Noto Sans",          category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 3 },
  { family: "Lato",               category: "Sans Serif",  styles: "100 | 300 | 400 | 700 | 900",       rank: 4  },
  { family: "Montserrat",         category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 5 },
  { family: "Roboto Condensed",   category: "Sans Serif",  styles: "100 | 300 | 400 | 500 | 700 | 900", rank: 6  },
  { family: "Source Sans 3",      category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 7 },
  { family: "Oswald",             category: "Display",     styles: "200 | 300 | 400 | 500 | 600 | 700", rank: 8  },
  { family: "Raleway",            category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 9 },
  { family: "Poppins",            category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 10 },
  // Rank 11-30
  { family: "Roboto Mono",        category: "Monospace",   styles: "100 | 200 | 300 | 400 | 500 | 600 | 700", rank: 11 },
  { family: "Nunito",             category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 12 },
  { family: "Playfair Display",   category: "Serif",       styles: "400 | 500 | 600 | 700 | 800 | 900", rank: 13 },
  { family: "Ubuntu",             category: "Sans Serif",  styles: "300 | 400 | 500 | 700",             rank: 14 },
  { family: "Merriweather",       category: "Serif",       styles: "300 | 400 | 700 | 900",             rank: 15 },
  { family: "Inter",              category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 16 },
  { family: "Arimo",              category: "Sans Serif",  styles: "400 | 500 | 600 | 700",             rank: 17 },
  { family: "PT Sans",            category: "Sans Serif",  styles: "400 | 700",                         rank: 18 },
  { family: "Noto Serif",         category: "Serif",       styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 19 },
  { family: "Roboto Slab",        category: "Serif",       styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 20 },
  { family: "Nunito Sans",        category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 21 },
  { family: "Work Sans",          category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 22 },
  { family: "Rubik",              category: "Sans Serif",  styles: "300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 23 },
  { family: "Lora",               category: "Serif",       styles: "400 | 500 | 600 | 700",             rank: 24 },
  { family: "Mukta",              category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700 | 800", rank: 25 },
  { family: "Noto Sans JP",       category: "Sans Serif",  styles: "100 | 300 | 400 | 500 | 700 | 900", rank: 26 },
  { family: "Josefin Sans",       category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700", rank: 27 },
  { family: "PT Serif",           category: "Serif",       styles: "400 | 700",                         rank: 28 },
  { family: "Source Code Pro",    category: "Monospace",   styles: "200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 29 },
  { family: "Libre Franklin",     category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 30 },
  // Rank 31-50
  { family: "DM Sans",            category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 31 },
  { family: "Fira Sans",          category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 32 },
  { family: "Quicksand",          category: "Sans Serif",  styles: "300 | 400 | 500 | 600 | 700",       rank: 33 },
  { family: "Titillium Web",      category: "Sans Serif",  styles: "200 | 300 | 400 | 600 | 700 | 900", rank: 34 },
  { family: "Archivo",            category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 35 },
  { family: "IBM Plex Sans",      category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700", rank: 36 },
  { family: "Oxygen",             category: "Sans Serif",  styles: "300 | 400 | 700",                   rank: 37 },
  { family: "Karla",              category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700 | 800", rank: 38 },
  { family: "Noto Sans KR",       category: "Sans Serif",  styles: "100 | 300 | 400 | 500 | 700 | 900", rank: 39 },
  { family: "Hind",               category: "Sans Serif",  styles: "300 | 400 | 500 | 600 | 700",       rank: 40 },
  { family: "Exo 2",              category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 41 },
  { family: "Cabin",              category: "Sans Serif",  styles: "400 | 500 | 600 | 700",             rank: 42 },
  { family: "Plus Jakarta Sans",  category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700 | 800", rank: 43 },
  { family: "Libre Baskerville",  category: "Serif",       styles: "400 | 700",                         rank: 44 },
  { family: "Ubuntu Condensed",   category: "Sans Serif",  styles: "400",                               rank: 45 },
  { family: "Archivo Black",      category: "Display",     styles: "400",                               rank: 46 },
  { family: "Space Grotesk",      category: "Sans Serif",  styles: "300 | 400 | 500 | 600 | 700",       rank: 47 },
  { family: "Bebas Neue",         category: "Display",     styles: "400",                               rank: 48 },
  { family: "Barlow",             category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 49 },
  { family: "Manrope",            category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700 | 800", rank: 50 },
  // Rank 51-80
  { family: "Noto Sans SC",       category: "Sans Serif",  styles: "100 | 300 | 400 | 500 | 700 | 900", rank: 51 },
  { family: "Crimson Text",       category: "Serif",       styles: "400 | 600 | 700",                   rank: 52 },
  { family: "EB Garamond",        category: "Serif",       styles: "400 | 500 | 600 | 700 | 800",       rank: 53 },
  { family: "Dosis",              category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700 | 800", rank: 54 },
  { family: "Dancing Script",     category: "Handwriting", styles: "400 | 500 | 600 | 700",             rank: 55 },
  { family: "Varela Round",       category: "Sans Serif",  styles: "400",                               rank: 56 },
  { family: "Ubuntu Mono",        category: "Monospace",   styles: "400 | 700",                         rank: 57 },
  { family: "Fjalla One",         category: "Display",     styles: "400",                               rank: 58 },
  { family: "Noto Sans TC",       category: "Sans Serif",  styles: "100 | 300 | 400 | 500 | 700 | 900", rank: 59 },
  { family: "Comfortaa",          category: "Display",     styles: "300 | 400 | 500 | 600 | 700",       rank: 60 },
  { family: "Nanum Gothic",       category: "Sans Serif",  styles: "400 | 700 | 800",                   rank: 61 },
  { family: "Mulish",             category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 62 },
  { family: "Zilla Slab",         category: "Serif",       styles: "300 | 400 | 500 | 600 | 700",       rank: 63 },
  { family: "Heebo",              category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 64 },
  { family: "Pacifico",           category: "Handwriting", styles: "400",                               rank: 65 },
  { family: "Catamaran",          category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 66 },
  { family: "Hind Madurai",       category: "Sans Serif",  styles: "300 | 400 | 500 | 600 | 700",       rank: 67 },
  { family: "Noto Serif JP",      category: "Serif",       styles: "200 | 300 | 400 | 500 | 600 | 700 | 900", rank: 68 },
  { family: "Signika Negative",   category: "Sans Serif",  styles: "300 | 400 | 500 | 600 | 700",       rank: 69 },
  { family: "Caveat",             category: "Handwriting", styles: "400 | 500 | 600 | 700",             rank: 70 },
  { family: "Lexend",             category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 71 },
  { family: "IBM Plex Mono",      category: "Monospace",   styles: "100 | 200 | 300 | 400 | 500 | 600 | 700", rank: 72 },
  { family: "Spectral",           category: "Serif",       styles: "200 | 300 | 400 | 500 | 600 | 700 | 800", rank: 73 },
  { family: "Overpass",           category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 74 },
  { family: "Prompt",             category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 75 },
  { family: "IBM Plex Serif",     category: "Serif",       styles: "100 | 200 | 300 | 400 | 500 | 600 | 700", rank: 76 },
  { family: "Bitter",             category: "Serif",       styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 77 },
  { family: "Yanone Kaffeesatz",  category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700", rank: 78 },
  { family: "PT Sans Narrow",     category: "Sans Serif",  styles: "400 | 700",                         rank: 79 },
  { family: "Exo",                category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 80 },
  // Rank 81-110
  { family: "Fira Sans Condensed",category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 81 },
  { family: "Arvo",               category: "Serif",       styles: "400 | 700",                         rank: 82 },
  { family: "Slabo 27px",         category: "Serif",       styles: "400",                               rank: 83 },
  { family: "Volkhov",            category: "Serif",       styles: "400 | 700",                         rank: 84 },
  { family: "Anton",              category: "Display",     styles: "400",                               rank: 89 },
  { family: "Barlow Condensed",   category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 95 },
  { family: "Assistant",          category: "Sans Serif",  styles: "200 | 300 | 400 | 500 | 600 | 700 | 800", rank: 99 },
  { family: "Alfa Slab One",      category: "Display",     styles: "400",                               rank: 105 },
  { family: "Arvo",               category: "Serif",       styles: "400 | 700",                         rank: 125 },
  // Rank 111-150 (business/professional focus)
  { family: "Noto Serif SC",      category: "Serif",       styles: "200 | 300 | 400 | 500 | 600 | 700 | 900", rank: 111 },
  { family: "Kalam",              category: "Handwriting", styles: "300 | 400 | 700",                   rank: 112 },
  { family: "Amatic SC",          category: "Handwriting", styles: "400 | 700",                         rank: 113 },
  { family: "Crimson Pro",        category: "Serif",       styles: "200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 114 },
  { family: "Cormorant Garamond", category: "Serif",       styles: "300 | 400 | 500 | 600 | 700",       rank: 115 },
  { family: "DM Serif Display",   category: "Serif",       styles: "400",                               rank: 116 },
  { family: "Barlow Semi Condensed", category: "Sans Serif", styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 117 },
  { family: "Inconsolata",        category: "Monospace",   styles: "200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 118 },
  { family: "Permanent Marker",   category: "Handwriting", styles: "400",                               rank: 119 },
  { family: "Courgette",          category: "Handwriting", styles: "400",                               rank: 120 },
  { family: "Jost",               category: "Sans Serif",  styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 121 },
  { family: "Indie Flower",       category: "Handwriting", styles: "400",                               rank: 122 },
  { family: "Teko",               category: "Sans Serif",  styles: "300 | 400 | 500 | 600 | 700",       rank: 123 },
  { family: "Shadows Into Light", category: "Handwriting", styles: "400",                               rank: 124 },
  { family: "Crete Round",        category: "Serif",       styles: "400",                               rank: 126 },
  { family: "Cinzel",             category: "Display",     styles: "400 | 500 | 600 | 700 | 800 | 900", rank: 127 },
  { family: "Forum",              category: "Display",     styles: "400",                               rank: 128 },
  { family: "Sacramento",         category: "Handwriting", styles: "400",                               rank: 129 },
  { family: "Noto Sans HK",       category: "Sans Serif",  styles: "100 | 300 | 400 | 500 | 700 | 900", rank: 130 },
  { family: "Questrial",          category: "Sans Serif",  styles: "400",                               rank: 131 },
  { family: "Great Vibes",        category: "Handwriting", styles: "400",                               rank: 132 },
  { family: "Righteous",          category: "Display",     styles: "400",                               rank: 133 },
  { family: "Abel",               category: "Sans Serif",  styles: "400",                               rank: 134 },
  { family: "Lobster",            category: "Display",     styles: "400",                               rank: 135 },
  { family: "Satisfy",            category: "Handwriting", styles: "400",                               rank: 136 },
  { family: "Parisienne",         category: "Handwriting", styles: "400",                               rank: 137 },
  { family: "Courgette",          category: "Handwriting", styles: "400",                               rank: 138 },
  { family: "Taviraj",            category: "Serif",       styles: "100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900", rank: 139 },
  { family: "Cinzel Decorative",  category: "Display",     styles: "400 | 700 | 900",                   rank: 140 },
  { family: "Cardo",              category: "Serif",       styles: "400 | 700",                         rank: 141 },
  { family: "Vidaloka",           category: "Serif",       styles: "400",                               rank: 142 },
  { family: "GFS Didot",          category: "Serif",       styles: "400",                               rank: 143 },
  { family: "Alegreya",           category: "Serif",       styles: "400 | 500 | 600 | 700 | 800 | 900", rank: 144 },
  { family: "Marcellus",          category: "Serif",       styles: "400",                               rank: 145 },
  { family: "Pinyon Script",      category: "Handwriting", styles: "400",                               rank: 146 },
  { family: "Poiret One",         category: "Display",     styles: "400",                               rank: 147 },
  { family: "Tenor Sans",         category: "Sans Serif",  styles: "400",                               rank: 148 },
  { family: "Space Mono",         category: "Monospace",   styles: "400 | 700",                         rank: 149 },
  { family: "Courier Prime",      category: "Monospace",   styles: "400 | 700",                         rank: 150 },
]

// Returns CSS font-family string for use in styles
export function getFontFamily(family: string): string {
  const cat = GOOGLE_FONTS.find(f => f.family === family)?.category ?? "Sans Serif"
  const fallback = cat === "Serif" ? "serif"
    : cat === "Monospace" ? "monospace"
    : cat === "Handwriting" ? "cursive"
    : "sans-serif"
  return `'${family}', ${fallback}`
}

// Injects a Google Fonts <link> tag into <head> if not already loaded
export function loadGoogleFont(family: string): void {
  if (typeof document === "undefined") return
  const id = `gf-${family.replace(/\s+/g, "-")}`
  if (document.getElementById(id)) return
  const link = document.createElement("link")
  link.id   = id
  link.rel  = "stylesheet"
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`
  document.head.appendChild(link)
}

// Unique categories for filtering
export const FONT_CATEGORIES = ["All", "Sans Serif", "Serif", "Display", "Handwriting", "Monospace"] as const
