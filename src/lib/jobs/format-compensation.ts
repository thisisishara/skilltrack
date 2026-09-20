import type { JobCompensation, SalaryAimPeriod } from "@/lib/jobs/extracted-job"

export function formatJobCompensation(compensation: JobCompensation): string | null {
  if (compensation.min == null && compensation.max == null) {
    return null
  }
  const amount = formatAmountPair(compensation.min, compensation.max)
  if (!amount) {
    return null
  }
  return joinPay(compensation.currency, amount, compensation.period)
}

export function formatSalaryAim(input: {
  target: number | null
  currency: string | null
  period: SalaryAimPeriod
}): string | null {
  if (input.target == null || !Number.isFinite(input.target)) {
    return null
  }
  return joinPay(input.currency, formatAmount(input.target), input.period)
}

function joinPay(
  currency: string | null,
  amount: string,
  period: string | null
) {
  const code = currency?.trim()
  const head = code ? `${code} ${amount}` : amount
  const suffix = periodSuffix(period)
  return suffix ? `${head} ${suffix}` : head
}

function formatAmountPair(min: number | null, max: number | null) {
  if (min != null && max != null && min !== max) {
    return `${formatAmount(min)}–${formatAmount(max)}`
  }
  const value = min ?? max
  return value == null ? null : formatAmount(value)
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value
  )
}

function periodSuffix(period: string | null) {
  if (period === "year") {
    return "/ year"
  }
  if (period === "month") {
    return "/ month"
  }
  if (period === "hour") {
    return "/ hour"
  }
  return ""
}
