import React from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm Delete',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          btnBg: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/20',
          icon: <Trash2 className="w-6 h-6" />,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          btnBg: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-amber-500/20',
          icon: <AlertTriangle className="w-6 h-6" />,
        };
      default:
        return {
          iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          btnBg: 'gradient-bg hover:opacity-90 text-white shadow-indigo-500/20',
          icon: <ShieldAlert className="w-6 h-6" />,
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6 relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-xl transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          
          {/* Glowing Icon Header */}
          <div className={`p-4 rounded-2xl border ${style.iconBg} shadow-inner`}>
            {style.icon}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 w-full pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-2 ${style.btnBg}`}
            >
              <span>{confirmText}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
