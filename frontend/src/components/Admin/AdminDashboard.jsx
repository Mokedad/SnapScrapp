import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trash2, AlertTriangle, ChevronLeft, RefreshCw, Shield } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ active: 0, claims: 0, collected: 0 });
  const [loading, setLoading] = useState(false);

  const verifyPin = async () => {
    try {
      const res = await axios.post(`${API}/admin/verify`, { pin });
      if (res.data.verified) {
        setVerified(true);
        localStorage.setItem('ucycle_admin_pin', pin);
        fetchData(pin);
      }
    } catch (e) {
      toast.error("Invalid PIN");
    }
  };

  const fetchData = async (adminPin) => {
    setLoading(true);
    try {
      const [reportsRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/reports?pin=${adminPin}`),
        axios.get(`${API}/admin/dashboard-full?pin=${adminPin}`)
      ]);
      setReports(reportsRes.data || []);
      setStats(statsRes.data?.stats || { active: 0, claims: 0, collected: 0 });
    } catch (e) {
      toast.error("Load failed");
    }
    setLoading(false);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Permanently delete this item?")) return;
    try {
      await axios.delete(`${API}/posts/${postId}?pin=${pin}`);
      setReports(reports.filter(r => r.post_id !== postId));
      toast.success("Deleted");
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  useEffect(() => {
    const savedPin = localStorage.getItem('ucycle_admin_pin');
    if (savedPin) {
      setPin(savedPin);
      setVerified(true);
      fetchData(savedPin);
    }
  }, []);

  // PIN Screen
  if (!verified) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <header className="p-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <Shield className="w-6 h-6 text-red-500" />
          <span className="text-white font-bold">Admin</span>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-slate-800 rounded-2xl p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
              placeholder="••••••••"
              className="w-full p-4 bg-slate-700 text-white text-center text-2xl tracking-widest rounded-xl mb-4"
              autoFocus
            />
            <button onClick={verifyPin} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl">
              Enter
            </button>
          </div>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-red-600 w-5 h-5" /> COMMUNITY DEFENSE
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(pin)} className="p-2 hover:bg-slate-100 rounded-lg">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
            {stats.active_posts || stats.active || 0} Live
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="p-4 grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 text-center border">
          <p className="text-2xl font-black text-slate-900">{stats.active_posts || 0}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold">Active</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-200">
          <p className="text-2xl font-black text-yellow-700">{stats.active_claims || 0}</p>
          <p className="text-[10px] text-yellow-600 uppercase font-bold">Claims</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
          <p className="text-2xl font-black text-green-700">{stats.collected_posts || 0}</p>
          <p className="text-[10px] text-green-600 uppercase font-bold">Collected</p>
        </div>
      </div>

      {/* Report Queue */}
      <div className="px-4 space-y-3">
        <h2 className="text-sm font-bold text-slate-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> REPORT QUEUE
        </h2>
        
        {reports.length === 0 ? (
          <div className="text-center p-10 text-slate-400 bg-white rounded-xl border border-dashed">
            <p>✅ No active threats.</p>
          </div>
        ) : (
          reports.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 flex justify-between items-center">
              <div>
                <p className="font-black text-xs text-slate-700 uppercase mb-1">
                  {r.reason === 'item_gone' && '❌ ITEM GONE'}
                  {r.reason === 'illegal_dumping' && '⚠️ ILLEGAL DUMPING'}
                  {r.reason === 'fake_location' && '📍 FAKE LOCATION'}
                  {r.reason === 'other' && '❓ OTHER ISSUE'}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  ID: {r.post_id?.slice(-8) || 'Unknown'}
                </p>
                {r.details && <p className="text-[10px] text-slate-500 mt-1 italic">"{r.details}"</p>}
              </div>
              <button 
                onClick={() => handleDelete(r.post_id)} 
                className="bg-red-50 text-red-600 p-3 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      <Toaster position="top-center" />
    </div>
  );
};

export default AdminDashboard;
