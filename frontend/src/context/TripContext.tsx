import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface TripContextType {
  groupId: string | null
  groupName: string | null
  groupCode: string | null
  setActiveGroup: (groupId: string, groupName: string, groupCode: string) => void
}

const TripContext = createContext<TripContextType | undefined>(undefined)

interface TripProviderProps {
  children: ReactNode
}

export const TripProvider = ({ children }: TripProviderProps) => {
  const [groupId, setGroupId] = useState<string | null>(() => localStorage.getItem('groupId'))
  const [groupName, setGroupName] = useState<string | null>(() => localStorage.getItem('groupName'))
  const [groupCode, setGroupCode] = useState<string | null>(() => localStorage.getItem('groupCode'))

  const setActiveGroup = (groupId: string, groupName: string, groupCode: string) => {
    setGroupId(groupId)
    setGroupName(groupName)
    setGroupCode(groupCode)

    localStorage.setItem('groupId', groupId)
    localStorage.setItem('groupName', groupName)
    localStorage.setItem('groupCode', groupCode)
  }

  return (
    <TripContext.Provider
      value={{
        groupId,
        groupName,
        groupCode,
        setActiveGroup,
      }}
    >
      {children}
    </TripContext.Provider>
  )
}

export const useTrip = () => {
  const context = useContext(TripContext)

  if (!context) {
    throw new Error('useTrip debe usarse dentro de un TripProvider')
  }

  return context
}