import React from 'react';
import { FolderOpen } from 'lucide-react';

export default function EmptyState({ icon: Icon = FolderOpen, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-600" />
      </div>
      <h3 className="text-slate-300 font-semibold text-base mb-1">{title}</h3>
      {description && <p className="text-slate-500 text-sm mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
