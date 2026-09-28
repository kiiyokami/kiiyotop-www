export const SERVER_DOWN = "Couldn't reach the kiiyo.top server."

export function unreachable(source: string): string {
  return `Couldn't reach ${source}.`
}
