import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import {
  Shield,
  ChevronLeft,
  X,
  RefreshCw,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Package,
  Handshake,
  Eye,
  Building,
  Download,
  FileDown,
  CheckCircle,
  Trash2,
  MapPinned,
  Mail,
  Edit,
  Plus
} from 'lucide-react';
import { CATEGORIES } from '../../utils/constants';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Category Badge Component
function CategoryBadge({ category }) {
  return (
    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full capitalize">
      {category?.replace('-', ' ')}
    </span>
  );
}

// Status Badge Component
function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    collected: 'bg-slate-100 text-slate-600',
    expired: 'bg-red-100 text-red-800'
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [illegalDumpingReports, setIllegalDumpingReports] = useState(null);
  const [brands, setBrands] = useState([]);
  const [brandStats, setBrandStats] = useState(null);
  const [itemTypes, setItemTypes] = useState([]);
  const [itemTypesSummary, setItemTypesSummary] = useState(null);
  const [partners, setPartners] = useState([]);
  const [partnerSummary, setPartnerSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("stats");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  
  // Brand form state
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandForm, setBrandForm] = useState({ name: '', category: 'appliances', notes: '' });

  // Fetch admin data
  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, postsRes, reportsRes, analyticsRes, illegalRes, brandsRes, brandStatsRes, itemTypesRes, itemTypesSummaryRes, partnersRes, partnerSummaryRes] = await Promise.all([
        axios.get(`${API}/admin/stats?pin=${pin}`),
        axios.get(`${API}/admin/posts?pin=${pin}`),
        axios.get(`${API}/reports?status=pending`),
        axios.get(`${API}/admin/analytics?pin=${pin}`),
        axios.get(`${API}/admin/illegal-dumping-reports?pin=${pin}`),
        axios.get(`${API}/admin/brands?pin=${pin}`),
        axios.get(`${API}/admin/brand-stats?pin=${pin}`),
        axios.get(`${API}/admin/item-types?pin=${pin}`),
        axios.get(`${API}/admin/item-types-summary?pin=${pin}`),
        axios.get(`${API}/admin/partners?pin=${pin}`),
        axios.get(`${API}/admin/partner-summary?pin=${pin}`)
      ]);
      setStats(statsRes.data);
      setPosts(postsRes.data);
      setReports(reportsRes.data);
      setAnalytics(analyticsRes.data);
      setIllegalDumpingReports(illegalRes.data);
      setBrands(brandsRes.data);
      setBrandStats(brandStatsRes.data);
      setItemTypes(itemTypesRes.data);
      setItemTypesSummary(itemTypesSummaryRes.data);
      setPartners(partnersRes.data);
      setPartnerSummary(partnerSummaryRes.data);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [pin]);

  // Export functions
  const handleExport = async (type) => {
    try {
      toast.loading(`Preparing ${type} export...`, { id: 'export' });
      const endpoints = {
        'item-types': '/admin/export/item-types',
        'partner-clicks': '/admin/export/partner-clicks',
        'brands': '/admin/export/brands',
        'posts': '/admin/export/posts',
        'all': '/admin/export/all'
      };
      const response = await axios.get(`${API}${endpoints[type]}?pin=${pin}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', type === 'all' ? 'ucycle_full_export.json' : `ucycle_${type}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type} data exported!`, { id: 'export' });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed", { id: 'export' });
    }
  };

  // Remove post
  const handleRemovePost = async (postId) => {
    try {
      await axios.delete(`${API}/admin/posts/${postId}?pin=${pin}`);
      toast.success("Post removed");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to remove post");
    }
  };

  // Mark report reviewed
  const handleReviewReport = async (reportId) => {
    try {
      await axios.patch(`${API}/admin/reports/${reportId}/reviewed?pin=${pin}`);
      toast.success("Report marked as reviewed");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to update report");
    }
  };

  // Brand management
  const handleSaveBrand = async () => {
    try {
      if (editingBrand) {
        await axios.put(`${API}/admin/brands/${editingBrand.id}?pin=${pin}`, brandForm);
        toast.success("Brand updated");
      } else {
        await axios.post(`${API}/admin/brands?pin=${pin}`, brandForm);
        toast.success("Brand added");
      }
      setShowBrandForm(false);
      setEditingBrand(null);
      setBrandForm({ name: '', category: 'appliances', notes: '' });
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to save brand");
    }
  };

  const handleDeleteBrand = async (brandId) => {
    if (!window.confirm("Delete this brand?")) return;
    try {
      await axios.delete(`${API}/admin/brands/${brandId}?pin=${pin}`);
      toast.success("Brand deleted");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to delete brand");
    }
  };

  const openEditBrand = (brand) => {
    setEditingBrand(brand);
    setBrandForm({ name: brand.name, category: brand.category, notes: brand.notes || '' });
    setShowBrandForm(true);
  };

  // Generate email for illegal dumping
  const generateIllegalDumpingEmail = async (reportId) => {
    try {
      const res = await axios.get(`${API}/admin/illegal-dumping-email/${reportId}?pin=${pin}`);
      const { subject, body } = res.data;
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast.success("Email content copied!");
      const mailtoLink = `mailto:council@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, '_blank');
    } catch (error) {
      toast.error("Failed to generate email");
    }
  };

  // PIN Entry Screen
  if (!verified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" data-testid="admin-pin-screen">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-600 to-lime-500 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Admin Access</h1>
            <p className="text-slate-500 mt-2">Enter PIN to continue</p>
          </div>

          <div className="flex justify-center gap-2 mb-8">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className={`w-3 h-3 rounded-full transition-colors ${pin.length > i ? 'bg-green-600' : 'bg-slate-200'}`} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((num, i) => (
              num === null ? <div key={i} className="w-16 h-16" /> : (
                <button
                  key={i}
                  className={`w-16 h-16 rounded-full text-2xl font-semibold transition-all ${num === 'del' ? 'bg-slate-100 text-slate-600' : 'bg-white shadow-md text-slate-800 hover:bg-slate-50 active:scale-95'}`}
                  onClick={() => {
                    if (num === 'del') {
                      setPin(p => p.slice(0, -1));
                    } else if (pin.length < 8) {
                      const newPin = pin + num;
                      setPin(newPin);
                      if (newPin.length === 8) {
                        setTimeout(() => {
                          setVerifying(true);
                          axios.post(`${API}/admin/verify`, { pin: newPin })
                            .then(res => {
                              if (res.data.verified) {
                                setPin(newPin);
                                setVerified(true);
                                fetchAdminData();
                              }
                            })
                            .catch(() => {
                              toast.error("Invalid PIN");
                              setPin("");
                            })
                            .finally(() => setVerifying(false));
                        }, 200);
                      }
                    }
                  }}
                  disabled={verifying}
                  data-testid={`pin-btn-${num}`}
                >
                  {num === 'del' ? <X className="w-6 h-6 mx-auto" /> : num}
                </button>
              )
            ))}
          </div>

          <button onClick={() => navigate('/')} className="mt-8 text-slate-500 text-sm flex items-center gap-2 mx-auto hover:text-slate-700" data-testid="back-to-map-btn">
            <ChevronLeft className="w-4 h-4" />
            Back to map
          </button>
        </div>
        <Toaster position="top-center" duration={1200} />
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-dashboard">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="admin-back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg text-slate-900">Admin Panel</h1>
        </div>
        <button onClick={fetchAdminData} className="p-2 hover:bg-slate-100 rounded-lg" disabled={loading} data-testid="admin-refresh-btn">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="flex border-b border-slate-200 bg-white overflow-x-auto">
        {[
          { id: 'stats', label: 'Stats', icon: BarChart3 },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'reports', label: 'Reports', icon: AlertTriangle },
          { id: 'types', label: 'Types', icon: Package },
          { id: 'partners', label: 'Partners', icon: Handshake },
          { id: 'posts', label: 'Posts', icon: Eye },
          { id: 'brands', label: 'Brands', icon: Building }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors whitespace-nowrap px-2 ${activeTab === tab.id ? 'text-green-700 border-b-2 border-green-600' : 'text-slate-500 hover:text-slate-700'}`}
            data-testid={`admin-tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-sm">Total Posts</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total_posts}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-sm">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active_posts}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-sm">Collected</p>
                <p className="text-3xl font-bold text-blue-600">{stats.collected_posts}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-sm">Expired</p>
                <p className="text-3xl font-bold text-amber-600">{stats.expired_posts}</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-4 text-white">
              <h3 className="font-semibold mb-2">Export Data</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleExport('posts')} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 py-2.5 rounded-xl text-sm font-medium">
                  <Download className="w-4 h-4" /> Posts CSV
                </button>
                <button onClick={() => handleExport('all')} className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 py-2.5 rounded-xl text-sm font-medium">
                  <FileDown className="w-4 h-4" /> Export All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white">
                <p className="text-green-100 text-xs">Conversion Rate</p>
                <p className="text-3xl font-bold">{analytics.metrics?.conversion_rate || 0}%</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white">
                <p className="text-blue-100 text-xs">Avg Posts/Day</p>
                <p className="text-3xl font-bold">{analytics.metrics?.avg_posts_per_day || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <button onClick={() => setSelectedRegion('all')} className={`px-4 py-2 rounded-full text-sm font-medium ${selectedRegion === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}>
                All Reports
              </button>
              <button onClick={() => setSelectedRegion('illegal')} className={`px-4 py-2 rounded-full text-sm font-medium ${selectedRegion === 'illegal' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                Illegal Dumping
              </button>
            </div>
            
            {selectedRegion === 'all' && reports.map(report => (
              <div key={report.id} className="bg-white rounded-xl p-4 shadow-sm">
                <p className="font-medium">{report.reason}</p>
                <p className="text-sm text-slate-500">{report.details}</p>
                <button onClick={() => handleReviewReport(report.id)} className="mt-2 text-green-600 text-sm font-medium">
                  Mark Reviewed
                </button>
              </div>
            ))}
            
            {selectedRegion === 'illegal' && illegalDumpingReports && (
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white">
                <h3 className="font-semibold">Illegal Dumping Reports</h3>
                <p className="text-2xl font-bold">{illegalDumpingReports.total}</p>
              </div>
            )}
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="flex">
                  <img src={post.image_base64?.startsWith('data:') ? post.image_base64 : `data:image/jpeg;base64,${post.image_base64}`} alt={post.title} className="w-24 h-24 object-cover" />
                  <div className="flex-1 p-3">
                    <h3 className="font-bold text-slate-900">{post.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <CategoryBadge category={post.category} />
                      <StatusBadge status={post.status} />
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 p-2">
                  <button onClick={() => handleRemovePost(post.id)} className="w-full py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Types Tab */}
        {activeTab === 'types' && (
          <div className="space-y-4">
            {itemTypesSummary && (
              <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 text-white">
                <h3 className="font-semibold">Types Summary</h3>
                <p className="text-2xl font-bold">{itemTypesSummary.total_types} types</p>
              </div>
            )}
            <button onClick={() => handleExport('item-types')} className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium">
              <Download className="w-5 h-5" /> Export Types
            </button>
          </div>
        )}

        {/* Partners Tab */}
        {activeTab === 'partners' && (
          <div className="space-y-4">
            {partnerSummary && (
              <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-4 text-white">
                <h3 className="font-semibold">Partner Clicks</h3>
                <p className="text-3xl font-bold">{partnerSummary.total_clicks}</p>
              </div>
            )}
          </div>
        )}

        {/* Brands Tab */}
        {activeTab === 'brands' && (
          <div className="space-y-4">
            <button onClick={() => { setShowBrandForm(true); setEditingBrand(null); setBrandForm({ name: '', category: 'appliances', notes: '' }); }} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium">
              <Plus className="w-5 h-5" /> Add Brand
            </button>
            
            {brands.map(brand => (
              <div key={brand.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-medium">{brand.name}</p>
                  <p className="text-sm text-slate-500">{brand.category}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditBrand(brand)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteBrand(brand.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Brand Form Modal */}
            {showBrandForm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-4">{editingBrand ? 'Edit Brand' : 'Add Brand'}</h3>
                  <input type="text" placeholder="Brand name" value={brandForm.name} onChange={e => setBrandForm(p => ({ ...p, name: e.target.value }))} className="w-full p-3 border rounded-xl mb-3" />
                  <select value={brandForm.category} onChange={e => setBrandForm(p => ({ ...p, category: e.target.value }))} className="w-full p-3 border rounded-xl mb-3">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setShowBrandForm(false)} className="flex-1 py-3 border rounded-xl">Cancel</button>
                    <button onClick={handleSaveBrand} className="flex-1 py-3 bg-green-600 text-white rounded-xl">Save</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Toaster position="top-center" duration={1200} />
    </div>
  );
}

export default AdminDashboard;
