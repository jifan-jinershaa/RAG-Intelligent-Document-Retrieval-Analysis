import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Scissors,
  Search,
  Bot,
  FlaskConical,
  BarChart3,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'documents'
  | 'chunking'
  | 'retrieval'
  | 'rag'
  | 'comparison'
  | 'evaluation'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  docCount: number;
  expCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  docCount,
  expCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'documents', label: 'Document Workspace', icon: FileText, badge: docCount > 0 ? String(docCount) : undefined },
    { id: 'chunking', label: 'Chunking Laboratory', icon: Scissors },
    { id: 'retrieval', label: 'Retrieval Playground', icon: Search },
    { id: 'rag', label: 'AI Question Answering', icon: Bot },
    { id: 'comparison', label: 'Comparison Laboratory', icon: FlaskConical, badge: '9 Configs' },
    { id: 'evaluation', label: 'Evaluation Dashboard', icon: BarChart3 },
    { id: 'history', label: 'Experiment History', icon: History, badge: expCount > 0 ? String(expCount) : undefined },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-800 bg-[#0B0F19] transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-800/80">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 shadow-lg shadow-indigo-500/20 text-white shrink-0">
            <Database className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent truncate">
                RAG<span className="text-purple-400">Lab</span>
              </span>
              <span className="text-xs text-slate-400 font-mono tracking-wider">RESEARCH PLATFORM</span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as NavTab)}
              className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-purple-950/60 to-indigo-950/40 text-purple-300 border border-purple-500/30 shadow-md shadow-purple-900/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              } ${collapsed ? 'justify-center' : 'justify-between'}`}
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-purple-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono shrink-0 ${
                    isActive
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Footer info */}
      {!collapsed && (
        <div className="p-4 mx-3 mb-4 rounded-xl bg-slate-900/80 border border-slate-800/90 text-xs text-slate-400">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-300">Architecture</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Hybrid RRF
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            MiniLM-L6-v2 + BM25Okapi + ChromaDB
          </div>
        </div>
      )}
    </aside>
  );
};
