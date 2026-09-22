import { describe, it, expect } from 'vitest'
import { count, hours, percent, decimal } from './format'

describe('count', () => {
  it('groups thousands', () => {
    expect(count(48213)).toBe('48,213')
  })
  it('leaves small numbers alone', () => {
    expect(count(7)).toBe('7')
  })
})

describe('hours', () => {
  it('converts minutes to one decimal place', () => {
    expect(hours(630)).toBe('10.5')
  })
  it('renders zero as 0.0 rather than an empty string', () => {
    expect(hours(0)).toBe('0.0')
  })
})

describe('percent', () => {
  it('defaults to one decimal place and appends the sign', () => {
    expect(percent(54.234)).toBe('54.2%')
  })
  it('honours an explicit precision', () => {
    expect(percent(97.8412, 2)).toBe('97.84%')
  })
})

describe('decimal', () => {
  it('fixes to two places by default', () => {
    expect(decimal(1.8)).toBe('1.80')
  })
})
