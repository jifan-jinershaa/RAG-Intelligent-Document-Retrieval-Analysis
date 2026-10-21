import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Overview } from './pages/Overview';
import { DocumentWorkspace } from './pages/DocumentWorkspace';
import { ChunkingLaboratory } from './pages/ChunkingLaboratory';
import { RetrievalPlayground } from './pages/RetrievalPlayground';
import { AIQuestionAnswering } from './pages/AIQuestionAnswering';
import { ComparisonLaboratory } from './pages/ComparisonLaboratory';
import { EvaluationDashboard } from './pages/EvaluationDashboard';
import { ExperimentHistory } from './pages/ExperimentHistory';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { DocumentBase, DashboardSummary, AppSettings } from './types';

const VALID_TABS: NavTab[] = [
  'overview',
  'documents',
  'chunking',
  'retrieval',
  'rag',
  'comparison',
  'evaluation',
  'history',
  'settings',
];

const getInitialTab = (): NavTab => {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase() as NavTab;
  return VALID_TABS.includes(hash) ? hash : 'overview';
};

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>(getInitialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [documents, setDocuments] = useState<DocumentBase[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
    window.location.hash = `#/${tab}`;
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase() as NavTab;
      if (VALID_TABS.includes(hash)) {
        setCurrentTab(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const fetchCoreData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [docsData, summaryData, settingsData] = await Promise.all([
        api.listDocuments(),
        api.getDashboardSummary(),
        api.getSettings(),
      ]);
      setDocuments(docsData);
      setSummary(summaryData);
      setSettings(settingsData);
      setIsBackendHealthy(true);

      // Default select the first document if none selected
      setSelectedDocIds((prev) => {
        if (prev.length === 0 && docsData.length > 0) {
          return [docsData[0].id];
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to connect to backend API:', err);
      setIsBackendHealthy(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCoreData();
  }, [fetchCoreData]);

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0D14] text-slate-100 font-sans">
      {/* Persistent Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        docCount={documents.length}
        expCount={summary?.total_experiments ?? 0}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <Navbar
          currentTab={currentTab}
          isBackendHealthy={isBackendHealthy}
          geminiKeySet={Boolean(settings?.gemini_api_key_set)}
          geminiModel={settings?.gemini_model || 'gemini-2.5-flash'}
          onRefresh={fetchCoreData}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          {currentTab === 'overview' && (
            <Overview
              summary={summary}
              onNavigate={handleTabChange}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentWorkspace
              documents={documents}
              selectedDocIds={selectedDocIds}
              onToggleSelectDoc={toggleSelectDoc}
              onRefreshDocs={fetchCoreData}
            />
          )}

          {currentTab === 'chunking' && (
            <ChunkingLaboratory
              documents={documents}
              selectedDocIds={selectedDocIds}
            />
          )}

          {currentTab === 'retrieval' && (
            <RetrievalPlayground
              documents={documents}
              selectedDocIds={selectedDocIds}
            />
          )}

          {currentTab === 'rag' && (
            <AIQuestionAnswering
              documents={documents}
              selectedDocIds={selectedDocIds}
              geminiKeySet={Boolean(settings?.gemini_api_key_set)}
              onNavigate={handleTabChange}
            />
          )}

          {currentTab === 'comparison' && (
            <ComparisonLaboratory
              documents={documents}
              selectedDocIds={selectedDocIds}
            />
          )}

          {currentTab === 'evaluation' && <EvaluationDashboard />}

          {currentTab === 'history' && <ExperimentHistory />}

          {currentTab === 'settings' && (
            <SettingsPage onSettingsUpdated={fetchCoreData} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
