import React from 'react';
import { MaintenanceProvider, useMaintenance } from './context/MaintenanceContext';
import { Navbar } from './components/Navbar';
import { TabNav } from './components/TabNav';
import { LoginView } from './components/LoginView';
import { DashboardTab } from './components/DashboardTab';
import { ResidentsTab } from './components/ResidentsTab';
import { ApartmentsTab } from './components/ApartmentsTab';
import { MaintenanceDuesTab } from './components/MaintenanceDuesTab';
import { PendingOverdueTab } from './components/PendingOverdueTab';
import { TenantHistoryTab } from './components/TenantHistoryTab';
import { ReportsTab } from './components/ReportsTab';
import { TenantPortal } from './components/TenantPortal';
import { ToastContainer } from './components/ToastContainer';

const MainPortal = () => {
  const { isAuthenticated, isAdmin, activeTab } = useMaintenance();

  if (!isAuthenticated) {
    return (
      <>
        <LoginView />
        <ToastContainer />
      </>
    );
  }

  return (
    <div>
      <Navbar />
      <main className="portal-main">
        {!isAdmin && <TenantPortal />}
        {isAdmin && <TabNav />}
        {isAdmin && activeTab === 'Dashboard' && <DashboardTab />}
        {isAdmin && activeTab === 'Residents' && <ResidentsTab />}
        {isAdmin && activeTab === 'Apartments' && <ApartmentsTab />}
        {isAdmin && activeTab === 'Maintenance Dues' && <MaintenanceDuesTab />}
        {isAdmin && activeTab === 'Pending / Overdue' && <PendingOverdueTab />}
        {isAdmin && activeTab === 'Tenant History' && <TenantHistoryTab />}
        {isAdmin && activeTab === 'Reports' && <ReportsTab />}
      </main>
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <MaintenanceProvider>
      <MainPortal />
    </MaintenanceProvider>
  );
}
