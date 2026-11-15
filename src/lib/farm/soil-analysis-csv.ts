import { validateSoilHorizons, type SoilHorizon } from './soil-profile'

export type SoilAnalysisCsvImport = {
  horizons: SoilHorizon[]
  sampleDate?: string
  laboratory?: string
  samplingMethod?: string
  rowCount: number
}

export type SoilAnalysisCsvResult =
  | { valid: true; value: SoilAnalysisCsvImport }
  | { valid: false; error: string }

const HEADER_ALIASES = {
  top: ['top_cm', 'depth_top_cm', 'top_depth_cm', 'profondeur_debut_cm', 'debut_cm'],
  bottom: ['bottom_cm', 'depth_bottom_cm', 'bottom_depth_cm', 'profondeur_fin_cm', 'fin_cm'],
  texture: ['texture', 'soil_texture', 'texture_sol'],
  ph: ['ph', 'soil_ph'],
  organicMatter: ['organic_matter_percent', 'organic_matter_pct', 'matiere_organique_percent', 'matiere_organique_pct', 'mo_percent'],
  sampleDate: ['sample_date', 'date_sample', 'date_echantillon'],
  laboratory: ['laboratory', 'lab', 'laboratoire', 'source_name'],
  samplingMethod: ['sampling_method', 'sample_method', 'methode_prelevement', 'methode_echantillonnage', 'protocole_prelevement'],
} as const

export function parseSoilAnalysisCsv(text: string): SoilAnalysisCsvResult {
  if (text.length > 1_000_000) return invalid('Le fichier dépasse la limite de 1 Mo.')
  const rows = parseRows(text.replace(/^\uFEFF/, ''))
  if (!rows.valid) return invalid(rows.error)
  const [headerRow, ...dataRows] = rows.rows
  if (!headerRow) return invalid('Le fichier CSV est vide.')

  const headers = headerRow.map(normalizeHeader)
  const column = (key: keyof typeof HEADER_ALIASES) => headers.findIndex(header => (HEADER_ALIASES[key] as readonly string[]).includes(header))
  const topIndex = column('top')
  const bottomIndex = column('bottom')
  if (topIndex < 0 || bottomIndex < 0) return invalid('Colonnes requises : profondeur_debut_cm et profondeur_fin_cm (ou top_cm et bottom_cm).')

  const textureIndex = column('texture')
  const phIndex = column('ph')
  const organicMatterIndex = column('organicMatter')
  const dateIndex = column('sampleDate')
  const laboratoryIndex = column('laboratory')
  const methodIndex = column('samplingMethod')
  const nonEmptyRows = dataRows.filter(row => row.some(value => value.trim() !== ''))
  if (!nonEmptyRows.length) return invalid('Ajoutez au moins une ligne de mesure sous les en-têtes.')
  if (nonEmptyRows.length > 5) return invalid('Un profil peut importer au maximum cinq intervalles de profondeur.')

  const horizons: SoilHorizon[] = []
  const sampleDates = new Set<string>()
  const laboratories = new Set<string>()
  const samplingMethods = new Set<string>()
  for (let index = 0; index < nonEmptyRows.length; index += 1) {
    const row = nonEmptyRows[index]
    const lineNumber = index + 2
    const topCm = parseNumber(row[topIndex])
    const bottomCm = parseNumber(row[bottomIndex])
    if (topCm === undefined || bottomCm === undefined) return invalid(`Ligne ${lineNumber} : les profondeurs de début et de fin doivent être des nombres en centimètres.`)

    const texture = textureIndex < 0 || !row[textureIndex]?.trim() ? undefined : parseTexture(row[textureIndex])
    if (textureIndex >= 0 && row[textureIndex]?.trim() && texture === undefined) return invalid(`Ligne ${lineNumber} : texture non reconnue. Utilisez sableux, limoneux, argileux ou inconnu.`)
    const ph = phIndex < 0 || !row[phIndex]?.trim() ? undefined : parseNumber(row[phIndex])
    if (phIndex >= 0 && row[phIndex]?.trim() && ph === undefined) return invalid(`Ligne ${lineNumber} : pH invalide.`)
    const organicMatterPercent = organicMatterIndex < 0 || !row[organicMatterIndex]?.trim() ? undefined : parseNumber(row[organicMatterIndex])
    if (organicMatterIndex >= 0 && row[organicMatterIndex]?.trim() && organicMatterPercent === undefined) return invalid(`Ligne ${lineNumber} : matière organique invalide.`)
    horizons.push({ topCm, bottomCm, texture, ph, organicMatterPercent })

    const date = row[dateIndex]?.trim()
    if (date) {
      const isoDate = parseDate(date)
      if (!isoDate) return invalid(`Ligne ${lineNumber} : date invalide. Utilisez AAAA-MM-JJ ou JJ/MM/AAAA.`)
      sampleDates.add(isoDate)
    }
    const laboratory = row[laboratoryIndex]?.trim()
    if (laboratory && laboratory.length > 120) return invalid(`Ligne ${lineNumber} : le nom du laboratoire ne peut pas dépasser 120 caractères.`)
    if (laboratory) laboratories.add(laboratory)
    const samplingMethod = row[methodIndex]?.trim()
    if (samplingMethod && samplingMethod.length > 120) return invalid(`Ligne ${lineNumber} : la méthode de prélèvement ne peut pas dépasser 120 caractères.`)
    if (samplingMethod) samplingMethods.add(samplingMethod)
  }

  if (sampleDates.size > 1) return invalid('Une seule date d’échantillon peut être associée à ce fichier.')
  if (laboratories.size > 1) return invalid('Une seule origine de laboratoire peut être associée à ce fichier.')
  if (samplingMethods.size > 1) return invalid('Une seule méthode de prélèvement peut être associée à ce fichier.')
  const sampleDate = sampleDates.values().next().value as string | undefined
  const laboratory = laboratories.values().next().value as string | undefined
  const samplingMethod = samplingMethods.values().next().value as string | undefined
  const analysisHorizons = horizons.map(horizon => ({ ...horizon, sourceType: 'lab-analysis' as const, sourceName: laboratory, sampleDate, samplingMethod }))
  const horizonError = validateSoilHorizons(analysisHorizons)
  if (horizonError) return invalid(horizonError)
  return {
    valid: true,
    value: {
      horizons: analysisHorizons,
      sampleDate,
      laboratory,
      samplingMethod,
      rowCount: nonEmptyRows.length,
    },
  }
}

export function soilAnalysisCsvTemplate() {
  return 'profondeur_debut_cm;profondeur_fin_cm;texture;ph;matiere_organique_percent;date_echantillon;laboratoire;methode_prelevement\n'
}

function invalid(error: string): SoilAnalysisCsvResult {
  return { valid: false, error }
}

function normalizeHeader(value: string) {
  return value.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(cm\)/g, ' cm ').replace(/%/g, ' percent ').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function parseNumber(value: string | undefined) {
  if (!value?.trim()) return undefined
  const number = Number(value.trim().replace(',', '.'))
  return Number.isFinite(number) ? number : undefined
}

function parseTexture(value: string): SoilHorizon['texture'] | undefined {
  const texture = value.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/^(sandy|sableux|sableuse|sable)$/.test(texture)) return 'sandy'
  if (/^(loamy|limoneux|limoneuse|limon)$/.test(texture)) return 'loamy'
  if (/^(clayey|argileux|argileuse|argile)$/.test(texture)) return 'clayey'
  if (/^(unknown|inconnu|inconnue|non determinee|non determine)$/.test(texture)) return 'unknown'
  return undefined
}

function parseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  const date = match ? `${match[3]}-${match[2]}-${match[1]}` : value
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date ? date : undefined
}

function parseRows(text: string): { valid: true; rows: string[][] } | { valid: false; error: string } {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = detectDelimiter(firstLine)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1 }
      else quoted = !quoted
    } else if (char === delimiter && !quoted) {
      row.push(cell); cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell); cell = ''
      if (row.some(value => value.trim())) rows.push(row)
      row = []
    } else {
      cell += char
    }
  }
  if (quoted) return { valid: false, error: 'Le CSV contient un guillemet non fermé.' }
  row.push(cell)
  if (row.some(value => value.trim())) rows.push(row)
  if (rows.length > 6) return { valid: false, error: 'Le CSV dépasse cinq lignes de mesures.' }
  const width = rows[0]?.length ?? 0
  if (rows.some(value => value.length !== width)) return { valid: false, error: 'Chaque ligne CSV doit avoir le même nombre de colonnes.' }
  return { valid: true, rows }
}

function detectDelimiter(line: string) {
  const counts = new Map<string, number>([[ ';', 0 ], [ ',', 0 ], [ '\t', 0 ]])
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted
    else if (!quoted && counts.has(line[index])) counts.set(line[index], (counts.get(line[index]) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ';'
}
