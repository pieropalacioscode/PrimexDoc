// components/ui/PremiumAlert.tsx
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

const styles = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800', icon: <CheckCircle2 className="text-emerald-500" /> },
  error: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-800', icon: <AlertCircle className="text-rose-500" /> },
  info: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800', icon: <Info className="text-blue-500" /> },
};

export function PremiumAlert({ type, title, message, onClose }: AlertProps) {
  const style = styles[type];

  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border ${style.bg} ${style.border} animate-in slide-in-from-top-2`}>
      <div className="shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1">
        <h3 className={`font-black text-xs uppercase tracking-widest ${style.text}`}>{title}</h3>
        <p className={`text-sm mt-1 opacity-80 ${style.text}`}>{message}</p>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
        <X size={16} />
      </button>
    </div>
  );
}