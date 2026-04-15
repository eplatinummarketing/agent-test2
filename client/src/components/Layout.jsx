import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Kanban, List, PlusCircle,
  Building2, ChevronLeft, ChevronRight, Search
} from 'lucide-react';

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pipeline', icon: Kanban,          label: 'Pipeline' },
  { to: '/deals',    icon: List,            label: 'All Deals' },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0`}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-white leading-tight">RE Deal CRM</p>
              <p className="text-xs text-slate-500">Portfolio Manager</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }
                ${collapsed ? 'justify-center' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  {!collapsed && <span>{label}</span>}
                </>
              )}
            </NavLink>
          ))}

          <div className="pt-2 border-t border-slate-800 mt-2">
            <button
              onClick={() => navigate('/deals/new')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 w-full
                ${collapsed ? 'justify-center' : ''}`}
            >
              <PlusCircle size={18} className="flex-shrink-0" />
              {!collapsed && <span>New Deal</span>}
            </button>
          </div>
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all w-full text-sm ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
