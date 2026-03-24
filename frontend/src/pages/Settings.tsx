import { useState } from 'react'
import { useAuthStore } from '../store/auth.store'
import { authApi } from '../api/auth'

export default function Settings() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    // In a full implementation this would call a PATCH /api/auth/profile
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-2xl font-bold text-white">Settings</h2>

      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Profile</h3>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email</label>
            <input
              value={profile.email}
              disabled
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-500 text-sm cursor-not-allowed"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
        <h3 className="text-sm font-medium text-gray-300">Mobile Sync API</h3>
        <p className="text-xs text-gray-400">Send usage data from your phone to this endpoint:</p>
        <code className="block bg-gray-800 rounded-lg px-3 py-2 text-xs text-indigo-300">
          POST /api/mobile-usage/sync
        </code>
        <pre className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 overflow-auto">
{`{
  "userId": ${user?.id ?? 1},
  "data": [
    { "appName": "Instagram", "minutesUsed": 32, "category": "Social" },
    { "appName": "YouTube",   "minutesUsed": 48, "category": "Entertainment" }
  ]
}`}
        </pre>
      </div>
    </div>
  )
}
