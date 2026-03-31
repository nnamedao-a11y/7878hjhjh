/**
 * Contracts Page (Cabinet)
 * 
 * /cabinet/contracts
 * 
 * Shows user's contracts and signing status
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FileText, 
  PencilLine, 
  CheckCircle, 
  Clock, 
  X,
  Eye,
  Download,
  Warning
} from '@phosphor-icons/react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Status Badge
const StatusBadge = ({ status }) => {
  const config = {
    draft: { color: 'zinc', icon: FileText, label: 'Чернетка' },
    sent: { color: 'blue', icon: Clock, label: 'Очікує підпису' },
    viewed: { color: 'amber', icon: Eye, label: 'Переглянуто' },
    signed: { color: 'emerald', icon: CheckCircle, label: 'Підписано' },
    rejected: { color: 'red', icon: X, label: 'Відхилено' },
    expired: { color: 'zinc', icon: Warning, label: 'Прострочено' },
  };
  const { color, icon: Icon, label } = config[status] || config.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-700`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

// Contract Card
const ContractCard = ({ contract, onSign, onView }) => {
  const canSign = ['sent', 'viewed'].includes(contract.status);
  
  return (
    <div 
      className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all
        ${canSign ? 'border-blue-300 bg-blue-50/30' : 'border-zinc-200'}`}
      data-testid={`contract-card-${contract.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-zinc-900">{contract.title}</h3>
          <p className="text-sm text-zinc-500 mt-0.5">{contract.type?.replace(/_/g, ' ')}</p>
        </div>
        <StatusBadge status={contract.status} />
      </div>
      
      {contract.vehicleTitle && (
        <div className="bg-zinc-50 rounded-lg p-3 mb-3">
          <div className="text-sm text-zinc-600">{contract.vehicleTitle}</div>
          {contract.vin && <div className="text-xs text-zinc-500 font-mono mt-1">VIN: {contract.vin}</div>}
          {contract.price && (
            <div className="text-lg font-bold text-zinc-900 mt-1">${contract.price?.toLocaleString()}</div>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-2 mt-4">
        {canSign && (
          <button
            onClick={() => onSign(contract)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            data-testid={`sign-contract-${contract.id}`}
          >
            <PencilLine size={18} />
            Підписати
          </button>
        )}
        
        <button
          onClick={() => onView(contract)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
          data-testid={`view-contract-${contract.id}`}
        >
          <Eye size={18} />
          Переглянути
        </button>
        
        {contract.status === 'signed' && contract.signedDocumentUrl && (
          <a
            href={contract.signedDocumentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
          >
            <Download size={18} />
          </a>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
        <span>Створено: {new Date(contract.createdAt).toLocaleDateString('uk-UA')}</span>
        {contract.signedAt && (
          <span className="text-emerald-600">Підписано: {new Date(contract.signedAt).toLocaleDateString('uk-UA')}</span>
        )}
      </div>
    </div>
  );
};

// Sign Modal
const SignModal = ({ contract, onClose, onConfirm }) => {
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    if (!agreed) {
      toast.error('Підтвердіть згоду з умовами');
      return;
    }
    
    setSigning(true);
    try {
      await onConfirm(contract);
      toast.success('Контракт успішно підписано!');
      onClose();
    } catch (error) {
      toast.error('Помилка підписання');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6" data-testid="sign-modal">
        <h2 className="text-xl font-bold text-zinc-900 mb-4">Підписання контракту</h2>
        
        <div className="bg-zinc-50 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-zinc-900">{contract.title}</h3>
          {contract.vehicleTitle && (
            <p className="text-sm text-zinc-600 mt-1">{contract.vehicleTitle}</p>
          )}
          {contract.price && (
            <p className="text-lg font-bold text-zinc-900 mt-2">${contract.price?.toLocaleString()}</p>
          )}
        </div>
        
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            data-testid="agree-checkbox"
          />
          <span className="text-sm text-zinc-600">
            Я ознайомився з умовами контракту та погоджуюсь з ними. 
            Мій електронний підпис має таку ж юридичну силу, як і власноручний.
          </span>
        </label>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Скасувати
          </button>
          <button
            onClick={handleSign}
            disabled={!agreed || signing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="confirm-sign-btn"
          >
            {signing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <PencilLine size={18} />
                Підписати
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ContractsPage = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signingContract, setSigningContract] = useState(null);

  const getCustomerId = () => {
    const path = window.location.pathname;
    const match = path.match(/\/cabinet\/([^/]+)/);
    return match?.[1] || localStorage.getItem('customerId');
  };

  const fetchContracts = useCallback(async () => {
    try {
      const customerId = getCustomerId();
      const response = await axios.get(`${API_URL}/api/contracts/me`, { params: { customerId } });
      setContracts(response.data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Помилка завантаження контрактів');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleSign = async (contract) => {
    try {
      await axios.post(`${API_URL}/api/contracts/${contract.id}/sign`);
      fetchContracts();
    } catch (error) {
      throw error;
    }
  };

  const handleView = async (contract) => {
    // Mark as viewed if sent
    if (contract.status === 'sent') {
      try {
        await axios.post(`${API_URL}/api/contracts/${contract.id}/view`);
        fetchContracts();
      } catch (error) {
        console.error('Error marking viewed:', error);
      }
    }
    
    // Open document if available
    if (contract.documentUrl) {
      window.open(contract.documentUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingContracts = contracts.filter(c => ['sent', 'viewed'].includes(c.status));
  const signedContracts = contracts.filter(c => c.status === 'signed');

  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="contracts-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Мої контракти</h1>
        <p className="text-zinc-600">Підписуйте контракти та переглядайте історію</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PencilLine size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-zinc-500">Очікують підпису</div>
              <div className="text-xl font-bold text-blue-600">{pendingContracts.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-sm text-zinc-500">Підписано</div>
              <div className="text-xl font-bold text-emerald-600">{signedContracts.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Contracts */}
      {pendingContracts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <PencilLine size={20} className="text-blue-500" />
            Потребують підпису ({pendingContracts.length})
          </h2>
          <div className="grid gap-4">
            {pendingContracts.map(contract => (
              <ContractCard 
                key={contract.id} 
                contract={contract} 
                onSign={() => setSigningContract(contract)}
                onView={() => handleView(contract)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Signed Contracts */}
      {signedContracts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-emerald-500" />
            Підписані ({signedContracts.length})
          </h2>
          <div className="grid gap-4">
            {signedContracts.map(contract => (
              <ContractCard 
                key={contract.id} 
                contract={contract}
                onSign={() => {}}
                onView={() => handleView(contract)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {contracts.length === 0 && (
        <div className="text-center py-12 bg-zinc-50 rounded-xl">
          <FileText size={48} className="text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 mb-2">Немає контрактів</h3>
          <p className="text-zinc-600">Ваші контракти з'являться тут</p>
        </div>
      )}

      {/* Sign Modal */}
      {signingContract && (
        <SignModal
          contract={signingContract}
          onClose={() => setSigningContract(null)}
          onConfirm={handleSign}
        />
      )}
    </div>
  );
};

export default ContractsPage;
