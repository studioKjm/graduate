/**
 * 숫자 포맷팅 유틸리티
 */

/**
 * 큰 숫자를 읽기 쉬운 형태로 포맷팅
 * @param value 숫자 값
 * @param locale 로케일 (기본값: 'ko-KR')
 * @returns 포맷팅된 문자열
 */
export function formatLargeNumber(value: number, locale: string = 'ko-KR'): string {
  if (value === 0) return '$0'
  
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  
  // 조 (Trillion) - 1,000,000,000,000
  if (absValue >= 1_000_000_000_000) {
    const formatted = (absValue / 1_000_000_000_000).toFixed(1)
    return `${sign}$${formatted}조`
  }
  
  // 억 (100 Million) - 100,000,000
  if (absValue >= 100_000_000) {
    const formatted = (absValue / 100_000_000).toFixed(1)
    return `${sign}$${formatted}억`
  }
  
  // 만 (10 Thousand) - 10,000
  if (absValue >= 10_000) {
    const formatted = (absValue / 10_000).toFixed(1)
    return `${sign}$${formatted}만`
  }
  
  // 천 (Thousand) - 1,000
  if (absValue >= 1_000) {
    const formatted = (absValue / 1_000).toFixed(1)
    return `${sign}$${formatted}천`
  }
  
  // 천 미만
  return `${sign}$${absValue.toLocaleString(locale)}`
}

/**
 * 국제 단위로 큰 숫자 포맷팅 (영어)
 * @param value 숫자 값
 * @returns 포맷팅된 문자열
 */
export function formatLargeNumberInternational(value: number): string {
  if (value === 0) return '$0'
  
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  
  // Trillion
  if (absValue >= 1_000_000_000_000) {
    const formatted = (absValue / 1_000_000_000_000).toFixed(1)
    return `${sign}$${formatted}T`
  }
  
  // Billion
  if (absValue >= 1_000_000_000) {
    const formatted = (absValue / 1_000_000_000).toFixed(1)
    return `${sign}$${formatted}B`
  }
  
  // Million
  if (absValue >= 1_000_000) {
    const formatted = (absValue / 1_000_000).toFixed(1)
    return `${sign}$${formatted}M`
  }
  
  // Thousand
  if (absValue >= 1_000) {
    const formatted = (absValue / 1_000).toFixed(1)
    return `${sign}$${formatted}K`
  }
  
  // 천 미만
  return `${sign}$${absValue.toLocaleString('en-US')}`
}

/**
 * 상세한 숫자 포맷팅 (콤마 포함)
 * @param value 숫자 값
 * @param locale 로케일 (기본값: 'ko-KR')
 * @returns 포맷팅된 문자열
 */
export function formatDetailedNumber(value: number, locale: string = 'ko-KR'): string {
  if (value === 0) return '$0'
  
  const sign = value < 0 ? '-' : ''
  const absValue = Math.abs(value)
  
  return `${sign}$${absValue.toLocaleString(locale)}`
}

/**
 * 퍼센티지 포맷팅
 * @param value 0-1 사이의 값
 * @param decimals 소수점 자릿수 (기본값: 1)
 * @returns 포맷팅된 퍼센티지 문자열
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * 연도 포맷팅
 * @param year 연도
 * @returns 포맷팅된 연도 문자열
 */
export function formatYear(year: number): string {
  return `${year}년`
}

/**
 * 두 개의 포맷 옵션을 제공하는 함수
 * @param value 숫자 값
 * @returns {short: string, detailed: string}
 */
export function formatNumberBoth(value: number) {
  return {
    short: formatLargeNumberInternational(value),
    detailed: formatDetailedNumber(value),
    korean: formatLargeNumber(value)
  }
}
