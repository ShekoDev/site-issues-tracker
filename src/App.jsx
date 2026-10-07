import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireAuth, RequirePerm } from './components/Guard'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import { useApp } from './state/AppContext'
import { EmptyState, TableSkeleton } from './components/ui'

/* الصفحات الإدارية تُحمَّل عند الحاجة فقط — تخفّف الحزمة الأولى */
const TaskForm = lazy(() => import('./pages/TaskForm'))
const Attention = lazy(() => import('./pages/Attention'))
const Users = lazy(() => import('./pages/Users'))
const Activity = lazy(() => import('./pages/Activity'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))

const Loading = () => <div className="page"><TableSkeleton rows={5} /></div>
const L = ({ children }) => <Suspense fallback={<Loading />}>{children}</Suspense>

function Home() {
  const { can } = useApp()
  return can('canViewAllTasks') ? <Dashboard /> : <Navigate to="/mine" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="tasks" element={<RequirePerm perm="canViewAllTasks"><Tasks /></RequirePerm>} />
        <Route path="tasks/new" element={<RequirePerm perm="canCreateTask"><L><TaskForm /></L></RequirePerm>} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="tasks/:id/edit" element={<RequirePerm perm="canEditTask"><L><TaskForm /></L></RequirePerm>} />
        <Route path="mine" element={<Tasks onlyMine />} />
        <Route path="attention" element={<RequirePerm perm="canViewAllTasks"><L><Attention /></L></RequirePerm>} />
        <Route path="users" element={<RequirePerm perm="canManageUsers"><L><Users /></L></RequirePerm>} />
        <Route path="activity" element={<RequirePerm perm="canViewHistory"><L><Activity /></L></RequirePerm>} />
        <Route path="reports" element={<RequirePerm perm="canGenerateReports"><L><Reports /></L></RequirePerm>} />
        <Route path="settings" element={<RequirePerm perm="canManageSettings"><L><Settings /></L></RequirePerm>} />
        <Route path="*" element={
          <div className="page"><div className="card">
            <EmptyState icon="search" title="الصفحة غير موجودة"
                        description="الرابط اللي فتحته مش موجود — ارجع للوحة المعلومات." />
          </div></div>
        } />
      </Route>
    </Routes>
  )
}
