import { useEffect, useState } from 'react'

/** يتابع استعلام وسائط ويعيد true/false — للتخطيطات الخاصة بالموبايل */
export function useMedia(query) {
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = e => setMatch(e.matches)
    setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export const useIsMobile = () => useMedia('(max-width: 900px)')
export const useIsNarrow = () => useMedia('(max-width: 760px)')
