import React, { useState } from 'react';
import { 
  Building2, 
  KeyRound, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  X, 
  CheckCircle2, 
  Radio, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface DeptOfficerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (officerName: string) => void;
}

export const DeptOfficerLoginModal: React.FC<DeptOfficerLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [officerId, setOfficerId] = useState('TN-OFFICER-042');
  const [secretPassword, setSecretPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Secret department passwords accepted
  const validPasswords = ['TAMILNADU-FISHERIES-2026', 'MRCC1554', 'TN-FISH', 'admin123'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPw = secretPassword.trim();
    if (validPasswords.includes(cleanPw) || cleanPw.toLowerCase() === 'secret') {
      setErrorMessage('');
      onLoginSuccess('Insp. R. Karunakaran (Mandapam Coastal Base)');
      onClose();
    } else {
      setErrorMessage('Invalid Department Secret Password. (ரகசிய கடவுச்சொல் தவறானது)');
    }
  };

  const handleDemoFill = () => {
    setOfficerId('TN-OFFICER-042');
    setSecretPassword('TAMILNADU-FISHERIES-2026');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white shadow-lg shadow-amber-950/60 border border-amber-400/40">
              <Building2 className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
                Fisheries Dept Admin Portal
              </h2>
              <p className="text-xs font-tamil text-amber-300">
                மீன்வளத்துறை அதிகாரிகள் உள்நுழைவு
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Warning Notice */}
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px]">
            <p className="font-bold text-white">
              Restricted Official Access (அரசு அதிகாரிகள் மட்டும்)
            </p>
            <p className="text-amber-200/90 leading-relaxed">
              This dashboard provides real-time fleet radar surveillance, Indo-Sri Lanka border breach enforcement, and Coast Guard MRCC 1554 dispatch controls. Secret authorization is required.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Officer ID / Badge Number (அதிகாரி அடையாள எண்)
            </label>
            <input
              type="text"
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              placeholder="e.g. TN-OFFICER-042"
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono-num"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Secret Department Password (ரகசிய கடவுச்சொல்)
              </label>
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-[10px] text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Fill Demo Secret
              </button>
            </div>
            <input
              type="password"
              value={secretPassword}
              onChange={(e) => setSecretPassword(e.target.value)}
              placeholder="Enter secret department password"
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono-num"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Default password: <code className="text-amber-300">TAMILNADU-FISHERIES-2026</code> or <code className="text-amber-300">MRCC1554</code>
            </span>
          </div>

          {/* Login button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-amber-950/60 border border-amber-400/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 mt-1"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Unlock Fisheries Department Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
