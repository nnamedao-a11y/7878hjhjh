import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, useAuth } from '../App';
import { useLang } from '../i18n';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gear, Bell, Shield, Palette, Database, Globe, Key, User, Plus, Trash, Check, X,
  ArrowsClockwise, Lightning, ShieldCheck, Warning, Plugs, Eye, EyeSlash, Sliders
} from '@phosphor-icons/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';

const Settings = () => {
  const { user } = useAuth();
  const { t } = useLang();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [profileData, setProfileData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [proxies, setProxies] = useState([]);
  const [proxyStatus, setProxyStatus] = useState(null);
  const [proxyLoading, setProxyLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [newProxy, setNewProxy] = useState({ host: '', port: '', protocol: 'http', username: '', password: '', priority: 1 });
  const [integrations, setIntegrations] = useState({ meta_access_token: '', meta_ad_account_id: '', fb_pixel_id: '', fb_access_token: '' });
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [showIntegrationPasswords, setShowIntegrationPasswords] = useState({});
  const isMasterAdmin = ['master_admin', 'owner'].includes(user?.role);

  useEffect(() => { fetchSettings(); if (user) { setProfileData({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '', phone: user.phone || '' }); } }, [user]);
  useEffect(() => { if (activeTab === 'proxy' && isMasterAdmin) fetchProxyStatus(); if (activeTab === 'integrations' && isMasterAdmin) fetchIntegrations(); }, [activeTab, isMasterAdmin]);

  const fetchSettings = async () => { try { const res = await axios.get(`${API_URL}/api/settings`); setSettings(res.data || []); } catch (err) { toast.error(t('error')); } finally { setLoading(false); } };

  const handleProfileUpdate = async (e) => { e.preventDefault(); try { await axios.put(`${API_URL}/api/users/me`, profileData); toast.success(t('profileUpdated')); } catch (err) { toast.error(t('error')); } };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error(t('passwordsMismatch')); return; }
    try { await axios.post(`${API_URL}/api/auth/change-password`, { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }); toast.success(t('passwordChanged')); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
    catch (err) { toast.error(err.response?.data?.message || t('error')); }
  };

  const fetchProxyStatus = async () => { setProxyLoading(true); try { const res = await axios.get(`${API_URL}/api/admin/proxy/status`); setProxyStatus(res.data); setProxies(res.data.proxies || []); } catch (err) { console.error('Proxy fetch error:', err); } finally { setProxyLoading(false); } };

  const handleAddProxy = async (e) => {
    e.preventDefault();
    if (!newProxy.host || !newProxy.port) { toast.error(t('proxyHostPortRequired')); return; }
    try { await axios.post(`${API_URL}/api/admin/proxy/add`, { host: newProxy.host, port: parseInt(newProxy.port), protocol: newProxy.protocol, username: newProxy.username || undefined, password: newProxy.password || undefined, priority: parseInt(newProxy.priority) || 1 }); toast.success(t('proxyAdded')); setNewProxy({ host: '', port: '', protocol: 'http', username: '', password: '', priority: 1 }); setShowAddForm(false); fetchProxyStatus(); }
    catch (err) { toast.error(err.response?.data?.message || t('error')); }
  };

  const handleRemoveProxy = async (id) => { if (!window.confirm(t('deleteProxyConfirm'))) return; try { await axios.delete(`${API_URL}/api/admin/proxy/remove/${id}`); toast.success(t('proxyRemoved')); fetchProxyStatus(); } catch (err) { toast.error(t('error')); } };

  const handleToggleProxy = async (id, enabled) => {
    try { if (enabled) { await axios.post(`${API_URL}/api/admin/proxy/disable/${id}`); } else { await axios.post(`${API_URL}/api/admin/proxy/enable/${id}`); } toast.success(enabled ? t('proxyDisabled') : t('proxyEnabled')); fetchProxyStatus(); }
    catch (err) { toast.error(t('error')); }
  };

  const handleTestProxy = async (id) => {
    setTestingId(id);
    try { const res = await axios.post(`${API_URL}/api/admin/proxy/test/${id}`); if (res.data.success) { toast.success(`${t('proxyWorking')} IP: ${res.data.ip || 'ok'}`); } else { toast.error(`${t('error')}: ${res.data.error || '?'}`); } fetchProxyStatus(); }
    catch (err) { toast.error(t('error')); } finally { setTestingId(null); }
  };

  const handleSetPriority = async (id, priority) => { try { await axios.post(`${API_URL}/api/admin/proxy/priority/${id}`, { priority }); toast.success(t('priorityUpdated')); fetchProxyStatus(); } catch (err) { toast.error(t('error')); } };
  const handleReloadProxies = async () => { try { await axios.post(`${API_URL}/api/admin/proxy/reload`); toast.success(t('proxiesReloaded')); fetchProxyStatus(); } catch (err) { toast.error(t('error')); } };
  const togglePasswordVisibility = (id) => { setShowPasswords(prev => ({ ...prev, [id]: !prev[id] })); };

  const fetchIntegrations = async () => {
    setIntegrationsLoading(true);
    try { 
      const res = await axios.get(`${API_URL}/api/settings`); 
      const allSettings = res.data || []; 
      const integrationKeys = [
        'meta_access_token', 'meta_ad_account_id', 'fb_pixel_id', 'fb_access_token',
        // New integrations
        'stripe_secret_key', 'stripe_publishable_key', 'stripe_webhook_secret',
        'ringostat_api_key', 'ringostat_account_id', 'ringostat_webhook_url',
        'openai_api_key',
        'docusign_integration_key', 'docusign_account_id', 'docusign_user_id', 'docusign_private_key',
        'telegram_bot_token', 'telegram_webhook_url',
        'contract_template_url'
      ]; 
      const integrationSettings = {}; 
      integrationKeys.forEach(key => { 
        const setting = allSettings.find(s => s.key === key); 
        integrationSettings[key] = setting?.isConfigured ? '***configured***' : (setting?.value || ''); 
      }); 
      setIntegrations(integrationSettings); 
    }
    catch (err) { console.error('Error fetching integrations:', err); } finally { setIntegrationsLoading(false); }
  };

  const handleSaveIntegration = async (key, value) => { if (!value || value === '***configured***') return; try { await axios.put(`${API_URL}/api/settings/${key}`, { value }); toast.success(t('settingSaved')); fetchIntegrations(); } catch (err) { toast.error(t('error')); } };
  const toggleIntegrationPasswordVisibility = (key) => { setShowIntegrationPasswords(prev => ({ ...prev, [key]: !prev[key] })); };

  const parseServer = (server) => { try { const url = new URL(server); return { protocol: url.protocol.replace(':', ''), host: url.hostname, port: url.port }; } catch { return { protocol: 'http', host: server, port: '' }; } };

  const settingLabels = {
    lead_statuses: t('settingLeadStatuses'), deal_statuses: t('settingDealStatuses'),
    deposit_statuses: t('settingDepositStatuses'), lead_sources: t('settingLeadSources'),
    sla_first_response_minutes: t('settingSlaFirstResponse'), sla_callback_minutes: t('settingSlaCallback')
  };

  const settingIcons = {
    lead_statuses: <Database size={22} weight="duotone" />, deal_statuses: <Database size={22} weight="duotone" />,
    deposit_statuses: <Database size={22} weight="duotone" />, lead_sources: <Globe size={22} weight="duotone" />
  };

  const roleLabels = {
    master_admin: t('roleMasterAdmin'), owner: t('roleMasterAdmin'), team_lead: 'Team Lead',
    admin: t('roleAdmin'), moderator: t('roleModerator'),
    manager: t('roleManager'), finance: t('roleFinance')
  };

  return (
    <motion.div data-testid="settings-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#18181B]" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{t('settingsTitle')}</h1>
        <p className="text-sm text-[#71717A] mt-1">{t('settingsSubtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#F4F4F5] p-1 rounded-xl inline-flex">
          <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:text-[#18181B] px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Gear size={16} />{t('settingsGeneral')}</TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-[#18181B] px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><User size={16} />{t('settingsProfile')}</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:text-[#18181B] px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Shield size={16} />{t('settingsSecurity')}</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:text-[#18181B] px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Bell size={16} />{t('settingsNotifications')}</TabsTrigger>
          {isMasterAdmin && <TabsTrigger value="integrations" className="data-[state=active]:bg-white data-[state=active]:text-[#18181B] px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Plugs size={16} />{t('settingsIntegrations')}</TabsTrigger>}
          {isMasterAdmin && <TabsTrigger value="proxy" className="data-[state=active]:bg-white data-[state=active]:text-[#18181B] px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Globe size={16} />{t('settingsProxy')}</TabsTrigger>}
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          {loading ? <div className="text-center py-12 text-[#71717A]">{t('loading')}</div> : (
            <div className="space-y-5">
              {settings.map(setting => (
                <div key={setting.id || setting.key} className="section-card" data-testid={`setting-${setting.key}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-[#4F46E5]">{settingIcons[setting.key] || <Gear size={22} weight="duotone" />}</div>
                    <div><h3 className="font-semibold text-[#18181B]" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{settingLabels[setting.key] || setting.key}</h3><p className="text-xs text-[#71717A]">{setting.description}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(setting.value) ? setting.value.map((val, i) => <span key={i} className="px-3 py-1.5 bg-[#F4F4F5] text-sm rounded-lg text-[#3F3F46] font-medium">{val}</span>) : <span className="text-sm text-[#3F3F46] font-medium">{JSON.stringify(setting.value)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Profile */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="section-card">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-[#18181B] rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-4">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
                <h3 className="font-semibold text-[#18181B] text-lg" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{user?.firstName} {user?.lastName}</h3>
                <p className="text-sm text-[#71717A]">{user?.email}</p>
                <span className="badge status-new mt-3">{roleLabels[user?.role] || user?.role}</span>
              </div>
            </div>
            <div className="section-card lg:col-span-2">
              <h3 className="font-semibold text-[#18181B] mb-6" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{t('editProfile')}</h3>
              <form onSubmit={handleProfileUpdate} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">{t('firstName')}</label><input type="text" value={profileData.firstName} onChange={(e) => setProfileData({...profileData, firstName: e.target.value})} className="input w-full" data-testid="profile-firstname" /></div>
                  <div><label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">{t('lastName')}</label><input type="text" value={profileData.lastName} onChange={(e) => setProfileData({...profileData, lastName: e.target.value})} className="input w-full" data-testid="profile-lastname" /></div>
                </div>
                <div><label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">{t('email')}</label><input type="email" value={profileData.email} onChange={(e) => setProfileData({...profileData, email: e.target.value})} className="input w-full" disabled data-testid="profile-email" /><p className="text-xs text-[#71717A] mt-1">{t('emailCannotChange')}</p></div>
                <div><label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">{t('phone')}</label><input type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} className="input w-full" data-testid="profile-phone" /></div>
                <button type="submit" className="btn-primary" data-testid="save-profile-btn">{t('saveChanges')}</button>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="section-card">
              <div className="flex items-center gap-3 mb-6"><Key size={22} weight="duotone" className="text-[#DC2626]" /><h3 className="font-semibold text-[#18181B]" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{t('changePassword')}</h3></div>
              <form onSubmit={handlePasswordChange} className="space-y-5">
                <div><label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">{t('currentPassword')}</label><input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} required className="input w-full" data-testid="current-password" /></div>
                <div><label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">{t('newPassword')}</label><input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} required className="input w-full" data-testid="new-password" /></div>
                <div><label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2">{t('confirmPassword')}</label><input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} required className="input w-full" data-testid="confirm-password" /></div>
                <button type="submit" className="btn-primary" data-testid="change-password-btn">{t('changePassword')}</button>
              </form>
            </div>
            <div className="section-card">
              <div className="flex items-center gap-3 mb-6"><Shield size={22} weight="duotone" className="text-[#059669]" /><h3 className="font-semibold text-[#18181B]" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{t('securityInfo')}</h3></div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#F4F4F5] rounded-xl"><div><p className="font-medium text-[#18181B]">{t('twoFactor')}</p><p className="text-xs text-[#71717A]">{t('twoFactorDesc')}</p></div><span className="badge status-contacted">{t('comingSoon')}</span></div>
                <div className="flex items-center justify-between p-4 bg-[#F4F4F5] rounded-xl"><div><p className="font-medium text-[#18181B]">{t('lastLogin')}</p><p className="text-xs text-[#71717A]">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('uk-UA') : t('unknown')}</p></div></div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div className="section-card max-w-2xl">
            <div className="flex items-center gap-3 mb-6"><Bell size={22} weight="duotone" className="text-[#7C3AED]" /><h3 className="font-semibold text-[#18181B]" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{t('notificationSettings')}</h3></div>
            <div className="space-y-4">
              {[
                { key: 'new_lead', label: t('notifNewLead'), desc: t('notifNewLeadDesc') },
                { key: 'task_due', label: t('notifTaskDue'), desc: t('notifTaskDueDesc') },
                { key: 'callback', label: t('notifCallback'), desc: t('notifCallbackDesc') },
                { key: 'deal_update', label: t('notifDealUpdate'), desc: t('notifDealUpdateDesc') },
                { key: 'deposit', label: t('notifDeposit'), desc: t('notifDepositDesc') },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-[#F4F4F5] rounded-xl"><div><p className="font-medium text-[#18181B]">{item.label}</p><p className="text-xs text-[#71717A]">{item.desc}</p></div><Switch defaultChecked data-testid={`notification-${item.key}`} /></div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Integrations */}
        {isMasterAdmin && (
          <TabsContent value="integrations">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6"><Plugs size={22} weight="duotone" className="text-[#7C3AED]" /><div><h3 className="font-semibold text-[#18181B]" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{t('marketingIntegrations')}</h3><p className="text-sm text-[#71717A]">{t('marketingIntegrationsDesc')}</p></div></div>
              {integrationsLoading ? <div className="text-center py-12 text-[#71717A]">{t('loading')}</div> : (
                <div className="grid gap-6">
                  <div className="section-card">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center"><svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></div>
                      <div><h4 className="font-semibold text-[#18181B]">Meta Ads API</h4><p className="text-xs text-[#71717A]">{t('metaAdsDesc')}</p></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Access Token</label><div className="flex gap-2"><div className="relative flex-1"><input type={showIntegrationPasswords.meta_access_token ? 'text' : 'password'} value={integrations.meta_access_token} onChange={e => setIntegrations(prev => ({ ...prev, meta_access_token: e.target.value }))} placeholder="EAAGm..." className="w-full px-4 py-2.5 pr-10 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none" /><button type="button" onClick={() => toggleIntegrationPasswordVisibility('meta_access_token')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]">{showIntegrationPasswords.meta_access_token ? <EyeSlash size={16} /> : <Eye size={16} />}</button></div><button onClick={() => handleSaveIntegration('meta_access_token', integrations.meta_access_token)} className="px-4 py-2.5 bg-[#7C3AED] text-white text-sm font-medium rounded-lg hover:bg-[#6D28D9] transition-colors">{t('save')}</button></div></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Ad Account ID</label><div className="flex gap-2"><input type="text" value={integrations.meta_ad_account_id} onChange={e => setIntegrations(prev => ({ ...prev, meta_ad_account_id: e.target.value }))} placeholder="act_123456789" className="flex-1 px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#7C3AED] outline-none" /><button onClick={() => handleSaveIntegration('meta_ad_account_id', integrations.meta_ad_account_id)} className="px-4 py-2.5 bg-[#7C3AED] text-white text-sm font-medium rounded-lg hover:bg-[#6D28D9] transition-colors">{t('save')}</button></div></div>
                    </div>
                  </div>

                  <div className="section-card">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-[#0866FF] flex items-center justify-center"><svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg></div>
                      <div><h4 className="font-semibold text-[#18181B]">Facebook Conversion API</h4><p className="text-xs text-[#71717A]">{t('fbCapiDesc')}</p></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Pixel ID</label><div className="flex gap-2"><input type="text" value={integrations.fb_pixel_id} onChange={e => setIntegrations(prev => ({ ...prev, fb_pixel_id: e.target.value }))} placeholder="123456789012345" className="flex-1 px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0866FF] outline-none" /><button onClick={() => handleSaveIntegration('fb_pixel_id', integrations.fb_pixel_id)} className="px-4 py-2.5 bg-[#0866FF] text-white text-sm font-medium rounded-lg hover:bg-[#0756D3] transition-colors">{t('save')}</button></div></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Access Token</label><div className="flex gap-2"><div className="relative flex-1"><input type={showIntegrationPasswords.fb_access_token ? 'text' : 'password'} value={integrations.fb_access_token} onChange={e => setIntegrations(prev => ({ ...prev, fb_access_token: e.target.value }))} placeholder="EAAGm..." className="w-full px-4 py-2.5 pr-10 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0866FF] outline-none" /><button type="button" onClick={() => toggleIntegrationPasswordVisibility('fb_access_token')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]">{showIntegrationPasswords.fb_access_token ? <EyeSlash size={16} /> : <Eye size={16} />}</button></div><button onClick={() => handleSaveIntegration('fb_access_token', integrations.fb_access_token)} className="px-4 py-2.5 bg-[#0866FF] text-white text-sm font-medium rounded-lg hover:bg-[#0756D3] transition-colors">{t('save')}</button></div></div>
                    </div>
                  </div>

                  <div className="bg-[#FEF3C7] rounded-xl p-5 border border-[#FCD34D]"><div className="flex gap-3"><Warning size={24} weight="duotone" className="text-[#D97706] flex-shrink-0" /><div><h3 className="text-sm font-semibold text-[#92400E] mb-1">{t('howToGetTokens')}</h3><p className="text-sm text-[#B45309]">{t('howToGetTokensDesc')}</p></div></div></div>

                  {/* STRIPE */}
                  <div className="section-card" data-testid="stripe-integration">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-[#635BFF] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>
                      </div>
                      <div><h4 className="font-semibold text-[#18181B]">Stripe Payments</h4><p className="text-xs text-[#71717A]">Оплата карткою, інвойси</p></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Secret Key</label><div className="flex gap-2"><div className="relative flex-1"><input type={showIntegrationPasswords.stripe_secret_key ? 'text' : 'password'} value={integrations.stripe_secret_key || ''} onChange={e => setIntegrations(prev => ({ ...prev, stripe_secret_key: e.target.value }))} placeholder="sk_live_..." className="w-full px-4 py-2.5 pr-10 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#635BFF] outline-none" /><button type="button" onClick={() => toggleIntegrationPasswordVisibility('stripe_secret_key')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]">{showIntegrationPasswords.stripe_secret_key ? <EyeSlash size={16} /> : <Eye size={16} />}</button></div><button onClick={() => handleSaveIntegration('stripe_secret_key', integrations.stripe_secret_key)} className="px-4 py-2.5 bg-[#635BFF] text-white text-sm font-medium rounded-lg hover:bg-[#4F46E5] transition-colors">{t('save')}</button></div></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Publishable Key</label><div className="flex gap-2"><input type="text" value={integrations.stripe_publishable_key || ''} onChange={e => setIntegrations(prev => ({ ...prev, stripe_publishable_key: e.target.value }))} placeholder="pk_live_..." className="flex-1 px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#635BFF] outline-none" /><button onClick={() => handleSaveIntegration('stripe_publishable_key', integrations.stripe_publishable_key)} className="px-4 py-2.5 bg-[#635BFF] text-white text-sm font-medium rounded-lg hover:bg-[#4F46E5] transition-colors">{t('save')}</button></div></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Webhook Secret</label><div className="flex gap-2"><div className="relative flex-1"><input type={showIntegrationPasswords.stripe_webhook_secret ? 'text' : 'password'} value={integrations.stripe_webhook_secret || ''} onChange={e => setIntegrations(prev => ({ ...prev, stripe_webhook_secret: e.target.value }))} placeholder="whsec_..." className="w-full px-4 py-2.5 pr-10 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#635BFF] outline-none" /><button type="button" onClick={() => toggleIntegrationPasswordVisibility('stripe_webhook_secret')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]">{showIntegrationPasswords.stripe_webhook_secret ? <EyeSlash size={16} /> : <Eye size={16} />}</button></div><button onClick={() => handleSaveIntegration('stripe_webhook_secret', integrations.stripe_webhook_secret)} className="px-4 py-2.5 bg-[#635BFF] text-white text-sm font-medium rounded-lg hover:bg-[#4F46E5] transition-colors">{t('save')}</button></div></div>
                    </div>
                  </div>

                  {/* RINGOSTAT */}
                  <div className="section-card" data-testid="ringostat-integration">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-[#FF6B35] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
                      </div>
                      <div><h4 className="font-semibold text-[#18181B]">Ringostat</h4><p className="text-xs text-[#71717A]">Колтрекінг, дзвінки</p></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">API Key</label><div className="flex gap-2"><div className="relative flex-1"><input type={showIntegrationPasswords.ringostat_api_key ? 'text' : 'password'} value={integrations.ringostat_api_key || ''} onChange={e => setIntegrations(prev => ({ ...prev, ringostat_api_key: e.target.value }))} placeholder="rs_..." className="w-full px-4 py-2.5 pr-10 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6B35] outline-none" /><button type="button" onClick={() => toggleIntegrationPasswordVisibility('ringostat_api_key')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]">{showIntegrationPasswords.ringostat_api_key ? <EyeSlash size={16} /> : <Eye size={16} />}</button></div><button onClick={() => handleSaveIntegration('ringostat_api_key', integrations.ringostat_api_key)} className="px-4 py-2.5 bg-[#FF6B35] text-white text-sm font-medium rounded-lg hover:bg-[#E85D2D] transition-colors">{t('save')}</button></div></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Account ID</label><div className="flex gap-2"><input type="text" value={integrations.ringostat_account_id || ''} onChange={e => setIntegrations(prev => ({ ...prev, ringostat_account_id: e.target.value }))} placeholder="123456" className="flex-1 px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6B35] outline-none" /><button onClick={() => handleSaveIntegration('ringostat_account_id', integrations.ringostat_account_id)} className="px-4 py-2.5 bg-[#FF6B35] text-white text-sm font-medium rounded-lg hover:bg-[#E85D2D] transition-colors">{t('save')}</button></div></div>
                    </div>
                  </div>

                  {/* OPENAI */}
                  <div className="section-card" data-testid="openai-integration">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-[#10A37F] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.6 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.1408 1.6465 4.4708 4.4708 0 0 1 .5765 3.0189zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>
                      </div>
                      <div><h4 className="font-semibold text-[#18181B]">OpenAI</h4><p className="text-xs text-[#71717A]">AI асистент, генерація тексту</p></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">API Key</label><div className="flex gap-2"><div className="relative flex-1"><input type={showIntegrationPasswords.openai_api_key ? 'text' : 'password'} value={integrations.openai_api_key || ''} onChange={e => setIntegrations(prev => ({ ...prev, openai_api_key: e.target.value }))} placeholder="sk-..." className="w-full px-4 py-2.5 pr-10 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#10A37F] outline-none" /><button type="button" onClick={() => toggleIntegrationPasswordVisibility('openai_api_key')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]">{showIntegrationPasswords.openai_api_key ? <EyeSlash size={16} /> : <Eye size={16} />}</button></div><button onClick={() => handleSaveIntegration('openai_api_key', integrations.openai_api_key)} className="px-4 py-2.5 bg-[#10A37F] text-white text-sm font-medium rounded-lg hover:bg-[#0D8A6A] transition-colors">{t('save')}</button></div></div>
                    </div>
                  </div>

                  {/* DOCUSIGN */}
                  <div className="section-card" data-testid="docusign-integration">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-[#FFD23F] flex items-center justify-center">
                        <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.08 5.1 7.63 12 4.18zM4 8.9l7 3.5v7.7l-7-3.5V8.9zm9 11.2v-7.7l7-3.5v7.7l-7 3.5z"/></svg>
                      </div>
                      <div><h4 className="font-semibold text-[#18181B]">DocuSign</h4><p className="text-xs text-[#71717A]">Електронний підпис договорів</p></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Integration Key</label><div className="flex gap-2"><div className="relative flex-1"><input type={showIntegrationPasswords.docusign_integration_key ? 'text' : 'password'} value={integrations.docusign_integration_key || ''} onChange={e => setIntegrations(prev => ({ ...prev, docusign_integration_key: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx-xxxx" className="w-full px-4 py-2.5 pr-10 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#FFD23F] outline-none" /><button type="button" onClick={() => toggleIntegrationPasswordVisibility('docusign_integration_key')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]">{showIntegrationPasswords.docusign_integration_key ? <EyeSlash size={16} /> : <Eye size={16} />}</button></div><button onClick={() => handleSaveIntegration('docusign_integration_key', integrations.docusign_integration_key)} className="px-4 py-2.5 bg-[#FFD23F] text-black text-sm font-medium rounded-lg hover:bg-[#F0C530] transition-colors">{t('save')}</button></div></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Account ID</label><div className="flex gap-2"><input type="text" value={integrations.docusign_account_id || ''} onChange={e => setIntegrations(prev => ({ ...prev, docusign_account_id: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx" className="flex-1 px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#FFD23F] outline-none" /><button onClick={() => handleSaveIntegration('docusign_account_id', integrations.docusign_account_id)} className="px-4 py-2.5 bg-[#FFD23F] text-black text-sm font-medium rounded-lg hover:bg-[#F0C530] transition-colors">{t('save')}</button></div></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">User ID</label><div className="flex gap-2"><input type="text" value={integrations.docusign_user_id || ''} onChange={e => setIntegrations(prev => ({ ...prev, docusign_user_id: e.target.value }))} placeholder="xxxxxxxx-xxxx-xxxx" className="flex-1 px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#FFD23F] outline-none" /><button onClick={() => handleSaveIntegration('docusign_user_id', integrations.docusign_user_id)} className="px-4 py-2.5 bg-[#FFD23F] text-black text-sm font-medium rounded-lg hover:bg-[#F0C530] transition-colors">{t('save')}</button></div></div>
                    </div>
                  </div>

                  {/* TELEGRAM */}
                  <div className="section-card" data-testid="telegram-integration">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-[#0088CC] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      </div>
                      <div><h4 className="font-semibold text-[#18181B]">Telegram Bot</h4><p className="text-xs text-[#71717A]">Сповіщення, алерти</p></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Bot Token</label><div className="flex gap-2"><div className="relative flex-1"><input type={showIntegrationPasswords.telegram_bot_token ? 'text' : 'password'} value={integrations.telegram_bot_token || ''} onChange={e => setIntegrations(prev => ({ ...prev, telegram_bot_token: e.target.value }))} placeholder="123456:ABC-..." className="w-full px-4 py-2.5 pr-10 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0088CC] outline-none" /><button type="button" onClick={() => toggleIntegrationPasswordVisibility('telegram_bot_token')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]">{showIntegrationPasswords.telegram_bot_token ? <EyeSlash size={16} /> : <Eye size={16} />}</button></div><button onClick={() => handleSaveIntegration('telegram_bot_token', integrations.telegram_bot_token)} className="px-4 py-2.5 bg-[#0088CC] text-white text-sm font-medium rounded-lg hover:bg-[#006DAA] transition-colors">{t('save')}</button></div></div>
                    </div>
                  </div>

                  {/* Contract Template */}
                  <div className="section-card" data-testid="contract-template">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-[#374151] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 4h7v5h5v11H6V4zm2 8v2h8v-2H8zm0 4v2h8v-2H8z"/></svg>
                      </div>
                      <div><h4 className="font-semibold text-[#18181B]">Шаблон договору</h4><p className="text-xs text-[#71717A]">URL до PDF шаблону</p></div>
                    </div>
                    <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">Template URL</label><div className="flex gap-2"><input type="text" value={integrations.contract_template_url || ''} onChange={e => setIntegrations(prev => ({ ...prev, contract_template_url: e.target.value }))} placeholder="https://..." className="flex-1 px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#374151] outline-none" /><button onClick={() => handleSaveIntegration('contract_template_url', integrations.contract_template_url)} className="px-4 py-2.5 bg-[#374151] text-white text-sm font-medium rounded-lg hover:bg-[#1F2937] transition-colors">{t('save')}</button></div></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Proxy */}
        {isMasterAdmin && (
          <TabsContent value="proxy">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3"><Globe size={22} weight="duotone" className="text-[#16A34A]" /><div><h3 className="font-semibold text-[#18181B]" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{t('proxyManagement')}</h3><p className="text-xs text-[#71717A]">{t('proxyManagementDesc')}</p></div></div>
              <div className="flex gap-3">
                <button onClick={handleReloadProxies} className="px-4 py-2 text-sm font-medium text-[#18181B] bg-[#F4F4F5] hover:bg-[#E4E4E7] rounded-lg flex items-center gap-2 transition-colors"><ArrowsClockwise size={16} />{t('reload')}</button>
                <button onClick={() => setShowAddForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-[#0A0A0B] hover:bg-[#18181B] rounded-lg flex items-center gap-2 transition-colors"><Plus size={16} />{t('addProxy')}</button>
              </div>
            </div>

            {proxyStatus && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="kpi-card"><div className="mb-3"><Globe size={24} weight="duotone" className="text-[#16A34A]" /></div><div className="kpi-value">{proxyStatus.total}</div><div className="kpi-label">{t('total')}</div></div>
                <div className="kpi-card"><div className="mb-3"><Check size={24} weight="duotone" className="text-[#059669]" /></div><div className="kpi-value text-[#059669]">{proxyStatus.active}</div><div className="kpi-label">{t('active')}</div></div>
                <div className="kpi-card"><div className="mb-3"><Warning size={24} weight="duotone" className="text-[#D97706]" /></div><div className="kpi-value text-[#D97706]">{proxyStatus.onCooldown}</div><div className="kpi-label">Cooldown</div></div>
                <div className="kpi-card"><div className="mb-3"><Plugs size={24} weight="duotone" className="text-[#71717A]" /></div><div className="kpi-value text-[#71717A]">{proxyStatus.disabled}</div><div className="kpi-label">{t('disabled')}</div></div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-[#E4E4E7] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#FAFAFA] border-b border-[#E4E4E7]">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#71717A] uppercase">ID</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#71717A] uppercase">{t('server')}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#71717A] uppercase">{t('auth')}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#71717A] uppercase">{t('priority')}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#71717A] uppercase">{t('statistics')}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-[#71717A] uppercase">{t('status')}</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-[#71717A] uppercase">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E7]">
                  {proxyLoading ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center"><div className="animate-spin w-6 h-6 border-2 border-[#0A0A0B] border-t-transparent rounded-full mx-auto"></div></td></tr>
                  ) : proxies.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-[#71717A]">{t('noProxies')}</td></tr>
                  ) : proxies.map((proxy) => {
                    const serverInfo = parseServer(proxy.server);
                    const isOnCooldown = proxy.cooldown_until && proxy.cooldown_until > Date.now();
                    return (
                      <tr key={proxy.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-6 py-4"><span className="text-sm font-mono text-[#18181B]">#{proxy.id}</span></td>
                        <td className="px-6 py-4"><div className="flex flex-col"><span className="text-sm font-medium text-[#18181B]">{serverInfo.host}</span><span className="text-xs text-[#71717A]">{serverInfo.protocol.toUpperCase()}:{serverInfo.port}</span></div></td>
                        <td className="px-6 py-4">{proxy.username ? <div className="flex items-center gap-2"><span className="text-sm text-[#18181B]">{proxy.username}</span><button onClick={() => togglePasswordVisibility(proxy.id)} className="text-[#71717A] hover:text-[#18181B]">{showPasswords[proxy.id] ? <EyeSlash size={14} /> : <Eye size={14} />}</button>{showPasswords[proxy.id] && proxy.password && <span className="text-xs text-[#71717A]">/ {proxy.password}</span>}</div> : <span className="text-sm text-[#71717A]">—</span>}</td>
                        <td className="px-6 py-4"><select value={proxy.priority} onChange={e => handleSetPriority(proxy.id, parseInt(e.target.value))} className="text-sm bg-[#F4F4F5] px-2 py-1 rounded border-0 focus:ring-1 focus:ring-[#0A0A0B]">{[1,2,3,4,5,6,7,8,9,10].map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                        <td className="px-6 py-4"><div className="flex items-center gap-3"><span className="text-xs px-2 py-1 bg-[#ECFDF5] text-[#059669] rounded-full">{proxy.success_count} ok</span><span className="text-xs px-2 py-1 bg-[#FEF2F2] text-[#DC2626] rounded-full">{proxy.error_count} err</span></div></td>
                        <td className="px-6 py-4">{!proxy.enabled ? <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#F4F4F5] text-[#71717A]"><X size={12} />{t('disabled')}</span> : isOnCooldown ? <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706]"><Warning size={12} />Cooldown</span> : <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#059669]"><Check size={12} />{t('active')}</span>}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleTestProxy(proxy.id)} disabled={testingId === proxy.id} className="p-2 text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] rounded-lg transition-colors disabled:opacity-50" title={t('test')}>{testingId === proxy.id ? <ArrowsClockwise size={16} className="animate-spin" /> : <Lightning size={16} />}</button>
                            <button onClick={() => handleToggleProxy(proxy.id, proxy.enabled)} className="p-2 text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] rounded-lg transition-colors" title={proxy.enabled ? t('disable') : t('enable')}>{proxy.enabled ? <X size={16} /> : <Check size={16} />}</button>
                            <button onClick={() => handleRemoveProxy(proxy.id)} className="p-2 text-[#71717A] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors" title={t('delete')}><Trash size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-[#F0F9FF] rounded-xl p-5 border border-[#BAE6FD]"><div className="flex gap-3"><ShieldCheck size={24} weight="duotone" className="text-[#0EA5E9] flex-shrink-0" /><div><h3 className="text-sm font-semibold text-[#0C4A6E] mb-1">{t('howProxiesWork')}</h3><p className="text-sm text-[#0369A1]">{t('howProxiesWorkDesc')}</p></div></div></div>

            <AnimatePresence>
              {showAddForm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                    <h2 className="text-lg font-semibold text-[#18181B] mb-6">{t('addNewProxy')}</h2>
                    <form onSubmit={handleAddProxy} className="space-y-4">
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">{t('protocol')}</label><select value={newProxy.protocol} onChange={e => setNewProxy({ ...newProxy, protocol: e.target.value })} className="w-full px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0A0A0B] outline-none"><option value="http">HTTP</option><option value="https">HTTPS</option><option value="socks5">SOCKS5</option></select></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">{t('ipAddress')} *</label><input type="text" value={newProxy.host} onChange={e => setNewProxy({ ...newProxy, host: e.target.value })} placeholder="192.168.1.1" className="w-full px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0A0A0B] outline-none" required /></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">{t('port')} *</label><input type="number" value={newProxy.port} onChange={e => setNewProxy({ ...newProxy, port: e.target.value })} placeholder="8080" className="w-full px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0A0A0B] outline-none" required /></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">{t('login')}</label><input type="text" value={newProxy.username} onChange={e => setNewProxy({ ...newProxy, username: e.target.value })} placeholder="username" className="w-full px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0A0A0B] outline-none" /></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">{t('password')}</label><input type="password" value={newProxy.password} onChange={e => setNewProxy({ ...newProxy, password: e.target.value })} placeholder="••••••••" className="w-full px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0A0A0B] outline-none" /></div>
                      <div><label className="block text-sm font-medium text-[#18181B] mb-2">{t('priority')} (1-10)</label><input type="number" min="1" max="10" value={newProxy.priority} onChange={e => setNewProxy({ ...newProxy, priority: e.target.value })} className="w-full px-4 py-2.5 bg-[#F4F4F5] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0A0A0B] outline-none" /></div>
                      <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-[#18181B] bg-[#F4F4F5] hover:bg-[#E4E4E7] rounded-lg">{t('cancel')}</button>
                        <button type="submit" className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#0A0A0B] hover:bg-[#18181B] rounded-lg">{t('add')}</button>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  );
};

export default Settings;
