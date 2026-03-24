import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

const links = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/timer', label: 'Timer', icon: '⏱' },
  { to: '/tasks', label: 'Tasks', icon: '✓' },
  { to: '/goals', label: 'Goals', icon: '◎' },
  { to: '/reports', label: 'Reports', icon: '▦' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white tracking-tight">Daily</h1>
        <p className="text-xs text-gray-400 mt-1 truncate">{user?.name}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <span className="w-4 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          ⏻ Logout
        </button>
      </div>
    </aside>
  )
}
