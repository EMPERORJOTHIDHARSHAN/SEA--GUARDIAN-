import React, { useState } from 'react';
import { BoatState, AlertState } from '../types/marine';
import { 
  Users, 
  Smartphone, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  Battery, 
  Fuel, 
  Clock, 
  PhoneCall, 
  Bell, 
  CheckCircle2, 
  Share2, 
  MessageSquare
} from 'lucide-react';

interface FamilyTrackingViewProps {
  boat: BoatState;
  alert: AlertState;
}

export const FamilyTrackingView: React.FC<FamilyTrackingViewProps> = ({
  boat,
  alert,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  // Simulated notifications sent to family
  const mockFamilyNotifications = [
    {
      time: '12 mins ago',
      title: 'Vessel Position Check (பாதுகாப்பு சோதனை)',
      desc: `Boat is cruising at ${boat.sog.toFixed(1)} kts in Indian waters. Distance to border is ${(alert.distanceMeters / 1000).toFixed(2)} km.`,
      status: alert.level === 'SAFE' ? 'SAFE' : 'ALERT',
    },
    {
      time: '2 hours ago',
      title: 'Fishing Harbor Departure (துறைமுகம் புறப்பட்டது)',
      desc: 'Annai Velankanni departed Rameswaram Fishing Jetty with 5 crew members onboard.',
      status: 'SAFE',
    },
    {
      time: '6 hours ago',
      title: 'Mandatory Safety Token Issued (டோக்கன் பதிவு)',
      desc: 'Fisheries Department Mandapam approved voyage token for Palk Bay fishing.',
      status: 'SAFE',
    },
  ];

  const handleShareTrackingLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Family Mobile App Frame / Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Main Family Guardian Status */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            {/* Top Vessel Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xl font-bold shadow-lg">
                  ⛵
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-num font-bold text-cyan-400">
                      {boat.regNumber}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      LIVE TRACKING
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {boat.name}
                  </h3>
                  <p className="text-xs font-tamil text-slate-400">
                    அப்பாவின் படகு நேரலை கண்காணிப்பு (Rameswaram Port)
                  </p>
                </div>
              </div>

              <button
                onClick={handleShareTrackingLink}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer border border-slate-700"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{copiedLink ? 'Link Copied!' : 'Share Live Link with Family'}</span>
              </button>
            </div>

            {/* Safety Assessment for Family */}
            <div className={`p-4 rounded-xl border mb-4 ${
              alert.level === 'SAFE'
                ? 'bg-emerald-950/40 border-emerald-500/40'
                : alert.level === 'YELLOW'
                ? 'bg-yellow-950/40 border-yellow-500/50'
                : 'bg-rose-950/50 border-rose-500'
            }`}>
              <div className="flex items-start gap-3">
                {alert.level === 'SAFE' ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 animate-bounce" />
                )}
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {alert.level === 'SAFE'
                      ? 'Boat is in Indian Waters – All Family Conditions Safe'
                      : alert.level === 'YELLOW'
                      ? 'Caution: Boat is within 2 km of International Boundary'
                      : 'URGENT: Boat is approaching boundary buffer zone!'}
                  </h4>
                  <p className="text-xs font-tamil text-amber-200 mt-1">
                    {alert.level === 'SAFE'
                      ? 'படகு பாதுகாப்பான இந்திய கடல் எல்லைக்குள் உள்ளது. கவலைப்பட தேவையில்லை.'
                      : 'படகு சர்வதேச எல்லைக்கு அருகில் உள்ளது. தானியங்கி எச்சரிக்கை அனுப்பப்பட்டுள்ளது.'}
                  </p>
                  <div className="text-xs text-slate-300 mt-2 font-mono-num">
                    Current Distance to IMBL: <strong>{(alert.distanceMeters / 1000).toFixed(2)} km</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Crew Onboard Details */}
            <div className="space-y-2 mb-4">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Crew Members Onboard (5 பேர்):
                </span>
                <span className="text-[10px] text-slate-400">All Life Jackets Verified</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{boat.skipperName}</span>
                    <span className="text-[10px] text-slate-400">Skipper / Master</span>
                  </div>
                  <span className="text-emerald-400 text-xs font-mono-num">Active at Helm</span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">S. David (டேவிட்)</span>
                    <span className="text-[10px] text-slate-400">Engine Technician</span>
                  </div>
                  <span className="text-emerald-400 text-xs font-mono-num">Deck Active</span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">R. Muthu (முத்து)</span>
                    <span className="text-[10px] text-slate-400">Net Operator</span>
                  </div>
                  <span className="text-emerald-400 text-xs font-mono-num">Deck Active</span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">P. Mani (மணி)</span>
                    <span className="text-[10px] text-slate-400">Crew Member</span>
                  </div>
                  <span className="text-emerald-400 text-xs font-mono-num">Deck Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Contact Helplines */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
              <span>Emergency Fisheries Officer Rameswaram: <strong>04573-221234</strong></span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span>Coast Guard Helpline:</span>
              <strong className="text-rose-400">1554 (Toll-Free)</strong>
            </div>
          </div>
        </div>

        {/* Right Col: Automated WhatsApp & SMS Notification Feed */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Family Notification Feed</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                SMS / WhatsApp
              </span>
            </div>

            <div className="space-y-3">
              {mockFamilyNotifications.map((notif, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{notif.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono-num">{notif.time}</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {notif.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* SMS Simulation info */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-300">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="font-semibold">Automated Border Proximity SMS:</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Family receives instant SMS if the vessel approaches within 2 km of international boundary line or if emergency SOS is pressed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
