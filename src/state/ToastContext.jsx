import { createContext, useCallback, useContext, useState } from 'react'
import Icon from '../components/Icon'

const Ctx = createContext(null)
export const useToast = () => useContext(Ctx)

const ICON = { success: 'checkCircle', error: 'alertCircle', info: 'info' }

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const remove = useCallback(id => setItems(a => a.filter(x => x.id !== id)), [])

  const push = useCallback((msg, kind = 'success', ms = 3200) => {
    const id = Math.random().toString(36).slice(2)
    setItems(a => [...a, { id, msg, kind }])
    if (ms) setTimeout(() => remove(id), ms)
  }, [remove])

  const api = {
    success: (m, ms) => push(m, 'success', ms),
    error: (m, ms) => push(m, 'error', ms ?? 5000),
    info: (m, ms) => push(m, 'info', ms)
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map(t => (
          <div key={t.id} className={`toast is-${t.kind}`}>
            <Icon name={ICON[t.kind]} size={17} />
            <span className="msg">{t.msg}</span>
            <button className="x" onClick={() => remove(t.id)} aria-label="إغلاق">
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
