interface Props {
  label: string
  value: string | number
  sub?: string
  color?: string
}

export default function StatCard({ label, value, sub, color = 'indigo' }: Props) {
  const colors: Record<string, string> = {
    indigo: 'border-indigo-500',
    green: 'border-green-500',
    yellow: 'border-yellow-500',
    red: 'border-red-500',
    blue: 'border-blue-500',
    purple: 'border-purple-500',
  }
  return (
    <div className={`bg-gray-900 rounded-xl p-4 border-l-4 ${colors[color] ?? colors.indigo}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
