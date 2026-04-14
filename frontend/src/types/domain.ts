export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: 'admin' | 'clinician' | 'viewer'
}
