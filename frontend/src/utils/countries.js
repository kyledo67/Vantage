/**
 * Static reference data for the country selector — names, ISO codes, and
 * flag emoji only. This is not eligibility logic: which countries Vantage
 * is actually available in is a backend decision (see
 * services/verification.js `checkCountryEligibility`), never decided here.
 */

function flagEmoji(isoCode) {
  return isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

const COUNTRY_CODES = [
  ['US', 'United States'],
  ['CA', 'Canada'],
  ['GB', 'United Kingdom'],
  ['AU', 'Australia'],
  ['NZ', 'New Zealand'],
  ['IE', 'Ireland'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['NL', 'Netherlands'],
  ['BE', 'Belgium'],
  ['SE', 'Sweden'],
  ['NO', 'Norway'],
  ['DK', 'Denmark'],
  ['FI', 'Finland'],
  ['PT', 'Portugal'],
  ['CH', 'Switzerland'],
  ['AT', 'Austria'],
  ['PL', 'Poland'],
  ['MX', 'Mexico'],
  ['BR', 'Brazil'],
  ['AR', 'Argentina'],
  ['JP', 'Japan'],
  ['KR', 'South Korea'],
  ['SG', 'Singapore'],
  ['IN', 'India'],
  ['ZA', 'South Africa'],
  ['AE', 'United Arab Emirates'],
]

export const COUNTRIES = COUNTRY_CODES.map(([code, name]) => ({
  code,
  name,
  flag: flagEmoji(code),
})).sort((a, b) => a.name.localeCompare(b.name))

export function findCountry(code) {
  return COUNTRIES.find((country) => country.code === code) ?? null
}
