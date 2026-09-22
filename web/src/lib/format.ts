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
