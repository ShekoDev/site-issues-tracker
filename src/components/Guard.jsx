import { Navigate } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { EmptyState } from './ui'

function FullSpinner() {
  return (
    <div className="state" style={{ minHeight: '60vh', justifyContent: 'center' }} aria-busy="true">
      <span className="sk" style={{ width: 34, height: 34, borderRadius: 999 }} />
      <p>جارٍ التحميل…</p>
    </div>
  )
}

export function RequireAuth({ children }) {
  const { session, profile, booting } = useApp()
  if (booting) return <FullSpinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <FullSpinner />
  return children
}

export function RequirePerm({ perm, children }) {
  const { can, isAdmin } = useApp()
  if (!can(perm) && !isAdmin) {
    return (
      <div className="page">
        <div className="card">
          <EmptyState icon="key" title="ليست لديك صلاحية الدخول لهذه الصفحة"
                      description="لو تحتاج الوصول، اطلب من الأدمن تعديل صلاحيات حسابك." />
        </div>
      </div>
    )
  }
  return children
}
