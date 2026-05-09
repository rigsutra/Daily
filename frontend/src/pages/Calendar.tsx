import { useState } from 'react';
import { tasksApi } from '../api/tasks';
import { Task } from '../types';

type TaskCompletionWithTask = {
  id: number;
  taskId: number;
  date: string;
  achieved: number;
  completed: boolean;
  createdAt: string;
  task: Task;
};

type RemovedTask = {
  id: number;
  taskId: number;
  taskTitle: string;
  reason: string;
  createdAt: string;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tasksForDate, setTasksForDate] = useState<TaskCompletionWithTask[]>([]);
  const [removedForDate, setRemovedForDate] = useState<RemovedTask[]>([]);
  const [loading, setLoading] = useState(false);

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
  const nextMonthPadding = 6 * 7 - (firstDayOfWeek + daysInMonth);

  const today = new Date();

  const fetchTasksForDate = async (date: Date) => {
    setLoading(true);
    try {
      const [completions, removed] = await Promise.all([
        tasksApi.completionsByDate(formatDate(date)),
        tasksApi.removedByDate(formatDate(date)),
      ]);
      setTasksForDate(completions);
      setRemovedForDate(removed);
    } catch {
      setTasksForDate([]);
      setRemovedForDate([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (day: number, offset: -1 | 0 | 1) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, day);
    setSelectedDate(date);
    fetchTasksForDate(date);
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
    setTasksForDate([]);
    setRemovedForDate([]);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
    setTasksForDate([]);
    setRemovedForDate([]);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
    setTasksForDate([]);
    setRemovedForDate([]);
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();

  const isSelected = (day: number) =>
    selectedDate !== null &&
    day === selectedDate.getDate() &&
    currentDate.getMonth() === selectedDate.getMonth() &&
    currentDate.getFullYear() === selectedDate.getFullYear();

  const completed = tasksForDate.filter(tc => tc.completed);
  const notCompleted = tasksForDate.filter(tc => !tc.completed);
  const mandatory = tasksForDate.filter(tc => tc.task.mandatory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-lg"
          >
            ‹
          </button>
          <h2 className="text-2xl font-bold text-white w-52 text-center">{monthYear}</h2>
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-lg"
          >
            ›
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-800">
          {WEEKDAYS.map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Prev-month filler */}
          {Array.from({ length: firstDayOfWeek }, (_, i) => {
            const day = daysInPrevMonth - firstDayOfWeek + i + 1;
            return (
              <div
                key={`prev-${day}`}
                onClick={() => handleDateClick(day, -1)}
                className="h-12 flex items-center justify-center text-sm text-gray-700 hover:bg-gray-800 cursor-pointer transition-colors border-b border-r border-gray-800/50"
              >
                {day}
              </div>
            );
          })}

          {/* Current month */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const todayCell = isToday(day);
            const selectedCell = isSelected(day);
            return (
              <div
                key={`curr-${day}`}
                onClick={() => handleDateClick(day, 0)}
                className={`h-12 flex items-center justify-center text-sm cursor-pointer transition-colors border-b border-r border-gray-800/50 ${
                  selectedCell
                    ? 'bg-indigo-600 text-white font-semibold'
                    : todayCell
                    ? 'ring-2 ring-indigo-500 ring-inset text-indigo-300 font-semibold hover:bg-gray-800'
                    : 'text-gray-200 hover:bg-gray-800'
                }`}
              >
                {day}
              </div>
            );
          })}

          {/* Next-month filler */}
          {Array.from({ length: nextMonthPadding }, (_, i) => (
            <div
              key={`next-${i + 1}`}
              onClick={() => handleDateClick(i + 1, 1)}
              className="h-12 flex items-center justify-center text-sm text-gray-700 hover:bg-gray-800 cursor-pointer transition-colors border-b border-r border-gray-800/50"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Task panel */}
      {selectedDate && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Tasks for{' '}
            <span className="text-indigo-400">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">Loading…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Completed */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Completed
                  <span className="ml-auto text-green-500 font-bold">{completed.length}</span>
                </h4>
                <div className="space-y-2">
                  {completed.length === 0 ? (
                    <p className="text-xs text-gray-600">None</p>
                  ) : (
                    completed.map(tc => (
                      <div key={tc.id} className="p-2 bg-green-900/20 border border-green-900/40 rounded-lg">
                        <p className="text-sm font-medium text-gray-100">{tc.task.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {tc.achieved} / {tc.task.target} {tc.task.unit}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Not Completed */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  Not Completed
                  <span className="ml-auto text-red-500 font-bold">{notCompleted.length}</span>
                </h4>
                <div className="space-y-2">
                  {notCompleted.length === 0 ? (
                    <p className="text-xs text-gray-600">None</p>
                  ) : (
                    notCompleted.map(tc => (
                      <div key={tc.id} className="p-2 bg-red-900/20 border border-red-900/40 rounded-lg">
                        <p className="text-sm font-medium text-gray-100">{tc.task.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Target: {tc.task.target} {tc.task.unit} · Achieved: {tc.achieved}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Mandatory */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Mandatory Tasks
                  <span className="ml-auto text-amber-500 font-bold">{mandatory.length}</span>
                </h4>
                <div className="space-y-2">
                  {mandatory.length === 0 ? (
                    <p className="text-xs text-gray-600">None</p>
                  ) : (
                    mandatory.map(tc => (
                      <div key={tc.id} className="p-2 bg-amber-900/20 border border-amber-900/40 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-100">{tc.task.title}</p>
                          <span className={`text-xs font-semibold ${tc.completed ? 'text-green-400' : 'text-red-400'}`}>
                            {tc.completed ? '✓' : '✗'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {tc.achieved} / {tc.task.target} {tc.task.unit}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Removed — only shown when tasks were deleted on this day */}
              {removedForDate.length > 0 && (
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                  <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    Removed Tasks
                    <span className="ml-auto text-amber-500 font-bold">{removedForDate.length}</span>
                  </h4>
                  <div className="space-y-2">
                    {removedForDate.map(r => (
                      <div key={r.id} className="p-2 bg-amber-900/20 border border-amber-900/40 rounded-lg">
                        <p className="text-sm font-medium text-gray-100">{r.taskTitle}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{r.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calendar;
