import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Shield, MapPin, PhoneForwarded, AlertOctagon, ChevronLeft, RefreshCw, TrendingUp, Package } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const AdminHQ = () => {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [data, setData] = useState({ stats: {}, reports: [] });
  const [loading, setLoading] = useState(true);

  const verifyPin = async () => {
    setVerifying(true);
    try {
      const res = await axios.post(`${API}/admin/verify`, { pin });
      if (res.data.verified) {
        setVerified(true);
        localStorage.setItem('ucycle_admin_pin', pin);
        fetchData(pin);
      }
    } catch (e) {
      toast.error("Invalid PIN");
    } finally {
      setVerifying(false);
    }
  };

  const fetchData = async (adminPin) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/admin/dashboard-full?pin=${adminPin}`);
      setData(res.data);
    } catch (e) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedPin = localStorage.getItem('ucycle_admin_pin');
    if (savedPin) {
      setPin(savedPin);
      setVerified(true);
      fetchData(savedPin);
    } else {
      setLoading(false);
    }
  }, []);

  // PIN Entry Screen
  if (!verified) {
    return (
      <div className="flex flex-col h-screen bg-slate-900 font-sans">
        <header className="p-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="text-green-500" /> UCYCLE HQ
          </h1>
        </header>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-xs">
            <div className="bg-slate-800 rounded-3xl p-6 text-center">
              <Shield className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Admin Access</h2>
              <p className="text-slate-400 text-sm mb-6">Enter PIN to continue</p>
              
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
                placeholder="••••••••"
                className="w-full p-4 bg-slate-700 text-white text-center text-2xl tracking-widest rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              
              <button
                onClick={verifyPin}
                disabled={verifying || !pin}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
              >
                {verifying ? 'Verifying...' : 'Enter HQ'}
              </button>
            </div>
          </div>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }

  // Main HQ Dashboard
  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <header className="p-4 bg-white border-b flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Shield className="text-green-600" /> UCYCLE HQ
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(pin)} className="p-2 hover:bg-slate-100 rounded-lg">
            <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-bold animate-pulse">
            LIVE DATA
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <MapPin className="text-blue-500 mb-2 w-6 h-6" />
          <p className="text-3xl font-black text-slate-900">{data.stats.direction_clicks || 0}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Direction Clicks</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <PhoneForwarded className="text-yellow-500 mb-2 w-6 h-6" />
          <p className="text-3xl font-black text-slate-900">{data.stats.contact_reveals || 0}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Contact Reveals</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <TrendingUp className="text-green-500 mb-2 w-6 h-6" />
          <p className="text-3xl font-black text-slate-900">{data.stats.claim_intents || 0}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Claim Intents</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <Package className="text-purple-500 mb-2 w-6 h-6" />
          <p className="text-3xl font-black text-slate-900">{data.stats.active_posts || 0}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Posts</p>
        </div>
      </div>

      {/* Pending/Active Stats Row */}
      <div className="px-4 grid grid-cols-3 gap-2">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-yellow-700">{data.stats.pending_posts || 0}</p>
          <p className="text-[9px] text-yellow-600 uppercase font-bold">Pending</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-green-700">{data.stats.active_claims || 0}</p>
          <p className="text-[9px] text-green-600 uppercase font-bold">Active Claims</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-slate-700">{data.stats.collected_posts || 0}</p>
          <p className="text-[9px] text-slate-600 uppercase font-bold">Collected</p>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="px-4 pb-20 mt-4 flex-1 overflow-y-auto">
        <h2 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4" /> RECENT REPORTS
        </h2>
        
        {data.reports.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-slate-200">
            <AlertOctagon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No recent reports</p>
          </div>
        ) : (
          data.reports.map(report => (
            <div 
              key={report.id} 
              className={`bg-white p-4 rounded-xl mb-2 border-l-4 shadow-sm ${
                report.reason === 'illegal_dumping' ? 'border-red-500' :
                report.reason === 'item_gone' ? 'border-yellow-500' :
                'border-slate-400'
              }`}
            >
              <p className="text-xs font-bold text-slate-800 capitalize">
                {report.reason.replace(/_/g, ' ')}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Post: {report.post_id.slice(0, 8)}... • {new Date(report.timestamp).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Navigation to Full Admin */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <button
          onClick={() => navigate('/admin')}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
        >
          Open Full Admin Panel →
        </button>
      </div>

      <Toaster position="top-center" />
    </div>
  );
};

export default AdminHQ;
