export function count(n: number): string {
  return n.toLocaleString('en-US')
}

export function hours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

export function percent(n: number, dp = 1): string {
  return `${n.toFixed(dp)}%`
}

export function decimal(n: number, dp = 2): string {
  return n.toFixed(dp)
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** The menu-bar clock, in the visitor's local time. */
export function clock(d: Date): { date: string; time: string } {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { date: `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`, time: `${hh}:${mm}` }
}
