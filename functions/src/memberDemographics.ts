export function normalizeGender(value: string | undefined): string {
    const normalized = (value || '').trim().toLowerCase()
    if (normalized === 'male') return 'Male'
    if (normalized === 'female') return 'Female'
    if (normalized) return 'Other'
    return 'Unknown'
}

export function getAgeRangeFromDob(
    dob: string | undefined,
    nowDate: Date = new Date()
): string {
    if (!dob) return 'Unknown'

    const birthDate = new Date(dob)
    if (Number.isNaN(birthDate.getTime())) return 'Unknown'

    let age = nowDate.getUTCFullYear() - birthDate.getUTCFullYear()
    const monthDelta = nowDate.getUTCMonth() - birthDate.getUTCMonth()
    const dayDelta = nowDate.getUTCDate() - birthDate.getUTCDate()
    if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
        age -= 1
    }

    if (age < 0) return 'Unknown'
    if (age <= 17) return '0-17'
    if (age <= 25) return '18-24'

    const start = Math.floor((age - 25) / 5) * 5 + 25
    return `${start}-${start + 4}`
}

export function getOutwardPostcode(postcode: string | undefined): string {
    if (!postcode) return 'Unknown'
    const trimmed = postcode.trim().toUpperCase()
    if (!trimmed) return 'Unknown'

    const spaceIndex = trimmed.indexOf(' ')
    if (spaceIndex > 0) return trimmed.slice(0, spaceIndex)

    const compact = trimmed.replace(/\s+/g, '')
    if (compact.length <= 3) return compact
    return compact.slice(0, compact.length - 3)
}

export function normalizeLeader(value: string | undefined): string {
    return (value || '').trim().toLowerCase() === 'yes' ? 'yes' : 'no'
}