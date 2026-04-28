import type React from 'react'

export interface NavItem {
  label: string
  href: string
  icon?: React.ReactNode
  badge?: string | number
}
