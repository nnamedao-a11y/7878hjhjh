/**
 * Calculator Admin Page
 * 
 * Повна панель керування ставками, комісіями та hidden fee
 * Master Admin може міняти всі параметри без коду
 */

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../App';
import { toast } from 'sonner';
import { useLang } from '../i18n';
import CustomSelect from '../components/ui/CustomSelect';
import { 
  Gear, 
  Calculator, 
  Truck, 
  Anchor, 
  Airplane,
  CurrencyDollar,
  Eye,
  EyeSlash,
  FloppyDisk,
  Trash,
  Plus,
  ArrowsClockwise,
  ChartLine
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const CalculatorAdmin = () => {
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [profile, setProfile] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [auctionRules, setAuctionRules] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Preview state
  const [previewInput, setPreviewInput] = useState({
    price: 15000,
    port: 'NJ',
    vehicleType: 'sedan'
  });
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [profileRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/calculator/config/profile`),
        axios.get(`${API_URL}/api/calculator/admin/stats`)
      ]);
      
      setProfile(profileRes.data);
      setStats(statsRes.data);
      
      if (profileRes.data?.code) {
        const [routesRes, rulesRes] = await Promise.all([
          axios.get(`${API_URL}/api/calculator/config/routes/${profileRes.data.code}`),
          axios.get(`${API_URL}/api/calculator/config/auction-fees/${profileRes.data.code}`)
        ]);
        setRoutes(routesRes.data);
        setAuctionRules(rulesRes.data);
      }
    } catch (err) {
      toast.error('Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  // Group routes by type
  const groupedRoutes = useMemo(() => {
    return {
      usa_inland: routes.filter(r => r.rateType === 'usa_inland'),
      ocean: routes.filter(r => r.rateType === 'ocean'),
      eu_delivery: routes.filter(r => r.rateType === 'eu_delivery')
    };
  }, [routes]);

  // Save profile
  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await axios.patch(`${API_URL}/api/calculator/config/profile`, profile);
      setProfile(res.data);
      toast.success('Профіль збережено');
    } catch (err) {
      toast.error('Помилка збереження профілю');
    } finally {
      setSaving(false);
    }
  };

  // Save route rate
  const saveRoute = async (route) => {
    try {
      const res = await axios.post(`${API_URL}/api/calculator/config/routes`, route);
      setRoutes(prev => {
        const idx = prev.findIndex(r => r._id === res.data._id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = res.data;
          return clone;
        }
        return [...prev, res.data];
      });
      toast.success('Ставку збережено');
    } catch (err) {
      toast.error('Помилка збереження ставки');
    }
  };

  // Delete route
  const deleteRoute = async (id) => {
    if (!window.confirm('Видалити цю ставку?')) return;
    try {
      await axios.delete(`${API_URL}/api/calculator/config/routes/${id}`);
      setRoutes(prev => prev.filter(r => r._id !== id));
      toast.success('Ставку видалено');
    } catch (err) {
      toast.error('Помилка видалення');
    }
  };

  // Save auction rule
  const saveAuctionRule = async (rule) => {
    try {
      const res = await axios.post(`${API_URL}/api/calculator/config/auction-fees`, rule);
      setAuctionRules(prev => {
        const idx = prev.findIndex(r => r._id === res.data._id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = res.data;
          return clone.sort((a, b) => a.minBid - b.minBid);
        }
        return [...prev, res.data].sort((a, b) => a.minBid - b.minBid);
      });
      toast.success('Правило збережено');
    } catch (err) {
      toast.error('Помилка збереження правила');
    }
  };

  // Delete auction rule
  const deleteAuctionRule = async (id) => {
    if (!window.confirm('Видалити це правило?')) return;
    try {
      await axios.delete(`${API_URL}/api/calculator/config/auction-fees/${id}`);
      setAuctionRules(prev => prev.filter(r => r._id !== id));
      toast.success('Правило видалено');
    } catch (err) {
      toast.error('Помилка видалення');
    }
  };

  // Run preview calculation
  const runPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/calculator/calculate`, previewInput);
      setPreviewResult(res.data);
    } catch (err) {
      toast.error('Помилка розрахунку');
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#18181B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#71717A]">Завантаження...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="calculator-admin-page"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#18181B]" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
            Налаштування калькулятора
          </h1>
          <p className="text-sm text-[#71717A] mt-1">
            Керування ставками, комісіями та hidden fee
          </p>
        </div>
        <button
          onClick={loadAllData}
          className="flex items-center gap-2 px-4 py-2 border border-[#E4E4E7] rounded-xl hover:bg-[#F4F4F5] transition-colors"
          data-testid="refresh-btn"
        >
          <ArrowsClockwise size={18} />
          Оновити
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={ChartLine} label="Всього розрахунків" value={stats.totalQuotes} />
          <StatCard icon={CurrencyDollar} label="Сума розрахунків" value={`$${stats.totalQuotedValue?.toLocaleString()}`} />
          <StatCard icon={Gear} label="Профілів" value={stats.profiles} />
          <StatCard icon={Calculator} label="Активний профіль" value={stats.activeProfile} />
        </div>
      )}

      {/* Profile Settings */}
      {profile && (
        <div className="card p-4 sm:p-6 space-y-6" data-testid="profile-settings">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F4F4F5] rounded-lg">
              <Gear size={20} className="text-[#18181B]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#18181B]">Налаштування профілю</h2>
              <p className="text-xs text-[#71717A]">Основні параметри калькулятора</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <InputField 
              label="Назва профілю" 
              value={profile.name || ''} 
              onChange={(v) => setProfile({...profile, name: v})}
            />
            <InputField 
              label="Країна" 
              value={profile.destinationCountry || ''} 
              onChange={(v) => setProfile({...profile, destinationCountry: v})}
            />
            <InputField 
              label="Валюта" 
              value={profile.currency || ''} 
              onChange={(v) => setProfile({...profile, currency: v})}
            />
            <NumberField 
              label="Insurance Rate (%)" 
              value={profile.insuranceRate * 100 || 0} 
              onChange={(v) => setProfile({...profile, insuranceRate: v / 100})}
            />
            <NumberField 
              label="USA Handling Fee ($)" 
              value={profile.usaHandlingFee || 0} 
              onChange={(v) => setProfile({...profile, usaHandlingFee: v})}
            />
            <NumberField 
              label="Bank Fee ($)" 
              value={profile.bankFee || 0} 
              onChange={(v) => setProfile({...profile, bankFee: v})}
            />
            <NumberField 
              label="EU Port Handling ($)" 
              value={profile.euPortHandlingFee || 0} 
              onChange={(v) => setProfile({...profile, euPortHandlingFee: v})}
            />
            <NumberField 
              label="Company Fee ($)" 
              value={profile.companyFee || 0} 
              onChange={(v) => setProfile({...profile, companyFee: v})}
            />
            <NumberField 
              label="Customs Rate (%)" 
              value={profile.customsRate * 100 || 0} 
              onChange={(v) => setProfile({...profile, customsRate: v / 100})}
            />
            <NumberField 
              label="Documentation Fee ($)" 
              value={profile.documentationFee || 0} 
              onChange={(v) => setProfile({...profile, documentationFee: v})}
            />
            <NumberField 
              label="Title Fee ($)" 
              value={profile.titleFee || 0} 
              onChange={(v) => setProfile({...profile, titleFee: v})}
            />
          </div>

          {/* Hidden Fees Section */}
          <div className="pt-4 border-t border-[#E4E4E7]">
            <h3 className="font-medium text-[#18181B] mb-3 flex items-center gap-2">
              <EyeSlash size={18} className="text-[#7C3AED]" />
              Hidden Fees (Margin Control)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumberField 
                label="Поріг ціни ($)" 
                value={profile.hiddenFeeThreshold || 5000} 
                onChange={(v) => setProfile({...profile, hiddenFeeThreshold: v})}
              />
              <NumberField 
                label="Fee нижче порогу ($)" 
                value={profile.hiddenFeeUnder || 700} 
                onChange={(v) => setProfile({...profile, hiddenFeeUnder: v})}
              />
              <NumberField 
                label="Fee вище порогу ($)" 
                value={profile.hiddenFeeOver || 1400} 
                onChange={(v) => setProfile({...profile, hiddenFeeOver: v})}
              />
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
            data-testid="save-profile-btn"
          >
            <FloppyDisk size={18} />
            {saving ? 'Збереження...' : 'Зберегти профіль'}
          </button>
        </div>
      )}

      {/* USA Inland Rates */}
      <RateSection
        title="USA Inland Delivery"
        icon={Truck}
        rates={groupedRoutes.usa_inland}
        profileCode={profile?.code}
        rateType="usa_inland"
        onSave={saveRoute}
        onDelete={deleteRoute}
        locationField="originCode"
      />

      {/* Ocean Rates */}
      <RateSection
        title="Ocean Freight"
        icon={Anchor}
        rates={groupedRoutes.ocean}
        profileCode={profile?.code}
        rateType="ocean"
        onSave={saveRoute}
        onDelete={deleteRoute}
        locationField="originCode"
      />

      {/* EU Delivery Rates */}
      <RateSection
        title="EU Delivery"
        icon={Airplane}
        rates={groupedRoutes.eu_delivery}
        profileCode={profile?.code}
        rateType="eu_delivery"
        onSave={saveRoute}
        onDelete={deleteRoute}
        locationField="destinationCode"
      />

      {/* Auction Fee Rules */}
      <div className="card p-4 sm:p-6 space-y-4 overflow-x-auto" data-testid="auction-rules-section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F4F4F5] rounded-lg">
              <CurrencyDollar size={20} className="text-[#18181B]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#18181B]">Auction Fee Rules</h2>
              <p className="text-xs text-[#71717A]">Аукціонні збори по діапазонам</p>
            </div>
          </div>
        </div>

        <div className="min-w-[400px]">
          <table className="table-premium w-full" data-testid="auction-rules-table">
            <thead>
              <tr>
                <th>Min ($)</th>
                <th>Max ($)</th>
                <th>Fee ($)</th>
                <th className="text-right">Дії</th>
              </tr>
            </thead>
            <tbody>
              {auctionRules.map(rule => (
                <AuctionRuleRow
                  key={rule._id}
                  rule={rule}
                  profileCode={profile?.code}
                  onSave={saveAuctionRule}
                  onDelete={deleteAuctionRule}
                />
              ))}
              <NewAuctionRuleRow
                profileCode={profile?.code}
                onSave={saveAuctionRule}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Preview */}
      <div className="card p-4 sm:p-6 space-y-4 overflow-hidden" data-testid="preview-section">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F4F4F5] rounded-lg">
            <Eye size={20} className="text-[#18181B]" />
          </div>
          <div>
            <h2 className="font-semibold text-[#18181B]">Live Preview</h2>
            <p className="text-xs text-[#71717A]">Тестовий розрахунок з поточними</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumberField 
            label="Ціна авто ($)" 
            value={previewInput.price} 
            onChange={(v) => setPreviewInput({...previewInput, price: v})}
          />
          <CustomSelect
            label="Порт"
            value={previewInput.port}
            onChange={(val) => setPreviewInput({...previewInput, port: val})}
            options={[
              { value: 'NJ', label: 'New Jersey' },
              { value: 'GA', label: 'Georgia' },
              { value: 'TX', label: 'Texas' },
              { value: 'CA', label: 'California' },
            ]}
            testId="preview-port"
            dropUp={true}
          />
          <CustomSelect
            label="Тип авто"
            value={previewInput.vehicleType}
            onChange={(val) => setPreviewInput({...previewInput, vehicleType: val})}
            options={[
              { value: 'sedan', label: 'Sedan' },
              { value: 'suv', label: 'SUV' },
              { value: 'bigSUV', label: 'Big SUV' },
              { value: 'pickup', label: 'Pickup' },
            ]}
            testId="preview-vehicle-type"
            dropUp={true}
          />
          <div className="flex items-end">
            <button
              onClick={runPreview}
              disabled={previewLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              data-testid="run-preview-btn"
            >
              <Calculator size={18} />
              <span className="hidden sm:inline">{previewLoading ? 'Розрахунок...' : 'Розрахувати'}</span>
              <span className="sm:hidden">{previewLoading ? '...' : 'Розрах.'}</span>
            </button>
          </div>
        </div>

        {previewResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-[#E4E4E7]">
            {/* Client View */}
            <div className="border border-[#E4E4E7] rounded-xl p-4">
              <h3 className="font-semibold text-[#18181B] mb-3 flex items-center gap-2">
                <Eye size={16} />
                Client View (Visible)
              </h3>
              <div className="space-y-2 text-sm">
                {previewResult.formattedBreakdown?.map((item, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-[#F4F4F5]">
                    <span className="text-[#71717A]">{item.label}</span>
                    <span className="font-medium">${item.value?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t-2 border-[#18181B] flex justify-between">
                <span className="font-semibold text-lg">Клієнт бачить:</span>
                <span className="font-bold text-xl text-[#059669]" data-testid="preview-visible-total">
                  ${previewResult.totals?.visible?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Manager View */}
            <div className="border border-[#7C3AED] bg-[#F5F3FF] rounded-xl p-4">
              <h3 className="font-semibold text-[#18181B] mb-3 flex items-center gap-2">
                <EyeSlash size={16} className="text-[#7C3AED]" />
                Manager View (Internal)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-[#E4E4E7]">
                  <span className="text-[#71717A]">Visible Total</span>
                  <span className="font-medium">${previewResult.totals?.visible?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E4E4E7]">
                  <span className="text-[#71717A]">Hidden Fee</span>
                  <span className="font-medium text-[#7C3AED]">+${previewResult.hiddenBreakdown?.hiddenFee?.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t-2 border-[#7C3AED] flex justify-between">
                <span className="font-semibold text-lg">Менеджер бачить:</span>
                <span className="font-bold text-xl text-[#7C3AED]" data-testid="preview-internal-total">
                  ${previewResult.totals?.internal?.toLocaleString()}
                </span>
              </div>
              <div className="mt-3 p-2 bg-white rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-[#71717A]">Controllable Margin:</span>
                  <span className="font-semibold text-[#059669]">
                    ${previewResult.margin?.controllableMargin?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value }) => (
  <div className="kpi-card">
    <div className="mb-3">
      <Icon size={24} weight="duotone" className="text-[#18181B]" />
    </div>
    <div className="kpi-value">{value}</div>
    <div className="kpi-label">{label}</div>
  </div>
);

// Input Field Component
const InputField = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-[#71717A] uppercase tracking-wider mb-2">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input"
    />
  </div>
);

// Number Field Component
const NumberField = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-[#71717A] uppercase tracking-wider mb-2">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="input"
    />
  </div>
);

// Rate Section Component
const RateSection = ({ title, icon: Icon, rates, profileCode, rateType, onSave, onDelete, locationField }) => {
  const vehicleTypes = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'bigSUV', label: 'Big SUV' },
    { value: 'pickup', label: 'Pickup' }
  ];
  const [newRate, setNewRate] = useState({ location: '', vehicleType: 'sedan', amount: 0 });

  const addNewRate = () => {
    if (!newRate.location || !newRate.amount) {
      toast.error('Заповніть всі поля');
      return;
    }
    onSave({
      profileCode,
      rateType,
      [locationField]: newRate.location,
      vehicleType: newRate.vehicleType,
      amount: newRate.amount
    });
    setNewRate({ location: '', vehicleType: 'sedan', amount: 0 });
  };

  return (
    <div className="card p-4 sm:p-6 space-y-4 overflow-visible">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#F4F4F5] rounded-lg">
          <Icon size={20} className="text-[#18181B]" />
        </div>
        <div>
          <h2 className="font-semibold text-[#18181B]">{title}</h2>
          <p className="text-xs text-[#71717A]">{rates.length} ставок</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table-premium w-full min-w-[500px]">
          <thead>
            <tr>
              <th>{locationField === 'originCode' ? 'Port' : 'Destination'}</th>
              <th>Vehicle Type</th>
              <th>Amount ($)</th>
              <th className="text-right">Дії</th>
            </tr>
          </thead>
          <tbody>
            {rates.map(rate => (
              <RateRow
                key={rate._id}
                rate={rate}
                profileCode={profileCode}
                rateType={rateType}
                locationField={locationField}
                onSave={onSave}
                onDelete={onDelete}
              />
            ))}
            {/* New Rate Row */}
            <tr className="bg-[#F4F4F5]">
              <td>
                <input
                  type="text"
                  value={newRate.location}
                  onChange={(e) => setNewRate({...newRate, location: e.target.value})}
                  placeholder="NJ, GA..."
                  className="input w-full max-w-[100px]"
                />
              </td>
              <td className="overflow-visible">
                <CustomSelect
                  value={newRate.vehicleType}
                  onChange={(val) => setNewRate({...newRate, vehicleType: val})}
                  options={vehicleTypes}
                  placeholder="Sedan"
                  dropUp={true}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={newRate.amount}
                  onChange={(e) => setNewRate({...newRate, amount: Number(e.target.value)})}
                  className="input w-full max-w-[100px]"
                />
              </td>
              <td>
                <button
                  onClick={addNewRate}
                  className="p-2 bg-[#18181B] text-white rounded-lg hover:bg-[#27272A]"
                >
                  <Plus size={16} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Rate Row Component
const RateRow = ({ rate, profileCode, rateType, locationField, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [editedAmount, setEditedAmount] = useState(rate.amount);

  const handleSave = () => {
    onSave({
      ...rate,
      profileCode,
      rateType,
      amount: editedAmount
    });
    setEditing(false);
  };

  return (
    <tr>
      <td className="font-mono">{rate[locationField] || '—'}</td>
      <td>{rate.vehicleType}</td>
      <td>
        {editing ? (
          <input
            type="number"
            value={editedAmount}
            onChange={(e) => setEditedAmount(Number(e.target.value))}
            className="input w-24"
            autoFocus
          />
        ) : (
          <span className="font-medium">${rate.amount?.toLocaleString()}</span>
        )}
      </td>
      <td>
        <div className="flex items-center justify-end gap-2">
          {editing ? (
            <button onClick={handleSave} className="p-2 bg-[#059669] text-white rounded-lg">
              <FloppyDisk size={14} />
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="p-2 hover:bg-[#F4F4F5] rounded-lg">
              <Gear size={14} className="text-[#71717A]" />
            </button>
          )}
          <button onClick={() => onDelete(rate._id)} className="p-2 hover:bg-[#FEE2E2] rounded-lg">
            <Trash size={14} className="text-[#DC2626]" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Auction Rule Row Component
const AuctionRuleRow = ({ rule, profileCode, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [editedFee, setEditedFee] = useState(rule.fee);

  const handleSave = () => {
    onSave({
      ...rule,
      profileCode,
      fee: editedFee
    });
    setEditing(false);
  };

  return (
    <tr>
      <td className="font-mono">${rule.minBid?.toLocaleString()}</td>
      <td className="font-mono">${rule.maxBid?.toLocaleString()}</td>
      <td>
        {editing ? (
          <input
            type="number"
            value={editedFee}
            onChange={(e) => setEditedFee(Number(e.target.value))}
            className="input w-24"
            autoFocus
          />
        ) : (
          <span className="font-medium text-[#D97706]">${rule.fee?.toLocaleString()}</span>
        )}
      </td>
      <td>
        <div className="flex items-center justify-end gap-2">
          {editing ? (
            <button onClick={handleSave} className="p-2 bg-[#059669] text-white rounded-lg">
              <FloppyDisk size={14} />
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="p-2 hover:bg-[#F4F4F5] rounded-lg">
              <Gear size={14} className="text-[#71717A]" />
            </button>
          )}
          <button onClick={() => onDelete(rule._id)} className="p-2 hover:bg-[#FEE2E2] rounded-lg">
            <Trash size={14} className="text-[#DC2626]" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// New Auction Rule Row Component
const NewAuctionRuleRow = ({ profileCode, onSave }) => {
  const [newRule, setNewRule] = useState({ minBid: 0, maxBid: 0, fee: 0 });

  const handleAdd = () => {
    if (!newRule.maxBid || !newRule.fee) {
      toast.error('Заповніть всі поля');
      return;
    }
    onSave({
      profileCode,
      ...newRule
    });
    setNewRule({ minBid: 0, maxBid: 0, fee: 0 });
  };

  return (
    <tr className="bg-[#F4F4F5]">
      <td>
        <input
          type="number"
          value={newRule.minBid}
          onChange={(e) => setNewRule({...newRule, minBid: Number(e.target.value)})}
          className="input w-full"
          placeholder="0"
        />
      </td>
      <td>
        <input
          type="number"
          value={newRule.maxBid}
          onChange={(e) => setNewRule({...newRule, maxBid: Number(e.target.value)})}
          className="input w-full"
          placeholder="999"
        />
      </td>
      <td>
        <input
          type="number"
          value={newRule.fee}
          onChange={(e) => setNewRule({...newRule, fee: Number(e.target.value)})}
          className="input w-full"
          placeholder="0"
        />
      </td>
      <td>
        <button
          onClick={handleAdd}
          className="p-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857]"
        >
          <Plus size={16} />
        </button>
      </td>
    </tr>
  );
};

export default CalculatorAdmin;
