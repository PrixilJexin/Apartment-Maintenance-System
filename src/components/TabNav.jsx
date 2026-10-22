import React from 'react';
import { useMaintenance, daysOverdue } from '../context/MaintenanceContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  AlertCircle,
  History,
  BarChart3
} from 'lucide-react';

export const TabNav = () => {
  const { activeTab, setActiveTab, setSelectedHistoryApt, data } = useMaintenance();

  const overdueCount = data.dues.filter(d => !d.paid && daysOverdue(d) > 0).length;

  const tabs = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Residents', label: 'Residents', icon: Users },
    { id: 'Apartments', label: 'Apartments', icon: Building2 },
    { id: 'Maintenance Dues', label: 'Maintenance Dues', icon: Receipt },
    { id: 'Pending / Overdue', label: 'Pending / Overdue', icon: AlertCircle, badge: overdueCount },
    { id: 'Tenant History', label: 'Tenant History', icon: History },
    { id: 'Reports', label: 'Reports', icon: BarChart3 }
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'Tenant History') {
      setSelectedHistoryApt(null);
    }
  };

  return (
    <nav className="portal-tabs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
            {Boolean(tab.badge) && tab.badge > 0 && (
              <span className="tab-badge">{tab.badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
