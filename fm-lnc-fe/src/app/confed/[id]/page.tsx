'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Tabs, Badge, Input, Button, Space, message } from 'antd';
import { SearchOutlined, PlusOutlined, InfoCircleOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import {
  fetchContinents,
  fetchNationsByContinent,
  fetchIntCompetitions,
  ConfederationItem,
  NationItem,
  CompetitionItem,
  getConfederationLogoUrl,
} from '../../../services/api';
import CardGrid from '../../../components/CardGrid';
import CompetitionGroupView from '../../../components/CompetitionGroupView';
import RecordDetailView from '../../../components/RecordDetailView';
import TabIconBadge from '../../../components/TabIconBadge';
import { NationIcon, IntCompIcon } from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

const CONFED_ID_MAP: Record<string, string> = {
  '1': 'CAF',
  '2': 'AFC',
  '3': 'UEFA',
  '4': 'CONCACAF',
  '5': 'OFC',
  '6': 'CONMEBOL',
  '7': 'World',
  '8': 'EXTINCT',
};

function ConfederationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    openRecordModal,
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
    refreshSignal,
  } = useApp();

  const confedId = params?.id ? String(params.id) : '';
  const initialTab =
    searchParams.get('tab') === 'int'
      ? 'INT_COMPETITIONS'
      : searchParams.get('tab') === 'nations'
        ? 'NATIONS'
        : 'INFO';

  const [confederation, setConfederation] = useState<ConfederationItem | null>(null);
  const [nations, setNations] = useState<NationItem[]>([]);
  const [intComps, setIntComps] = useState<CompetitionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'NATIONS' | 'INT_COMPETITIONS' | 'INFO'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    message.success(`Copied: ${text}`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Server pagination and search states (pageSize = 20)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalNationsRecords, setTotalNationsRecords] = useState(0);
  const [totalIntCompsRecords, setTotalIntCompsRecords] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Load Confederation metadata (title, logo, badges)
  const loadConfedInfo = useCallback(async () => {
    if (!confedId) return;
    try {
      const continents = await fetchContinents();
      const continentsList: ConfederationItem[] = Array.isArray(continents)
        ? continents
        : Array.isArray((continents as any)?.content)
          ? (continents as any).content
          : [];

      const found = continentsList.find(
        (c) =>
          String(c.id) === String(confedId) ||
          c.name?.toUpperCase() === String(confedId).toUpperCase() ||
          CONFED_ID_MAP[String(c.id)]?.toUpperCase() === String(confedId).toUpperCase() ||
          CONFED_ID_MAP[String(confedId)]?.toUpperCase() === c.name?.toUpperCase()
      );
      if (found) {
        setConfederation(found);
        const displayName = CONFED_ID_MAP[String(found.id)] || found.name;
        setHeaderTitle(displayName);
        setHeaderId(found.id);
        setBackHref('/');
        setBreadcrumbs([
          {
            title: 'FM',
            href: '/',
          },
          {
            title: displayName,
          },
        ]);
        setHeaderLogo({
          url: getConfederationLogoUrl(found.id),
          alt: found.name,
          isFlag: false,
        });
        const totalNat = found.stats?.nations ?? found.totalNations;
        const totalInt = found.stats?.intComps ?? found.totalIntComps;
        if (totalNat !== undefined) setTotalNationsRecords(totalNat);
        if (totalInt !== undefined) setTotalIntCompsRecords(totalInt);
      }
    } catch (err: any) {
      console.error('Failed to load confederation info:', err);
    } finally {
      setLoading(false);
    }
  }, [confedId, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Load tab records with server pagination & API keyword search
  const loadTabData = useCallback(
    async (tab: 'NATIONS' | 'INT_COMPETITIONS', page = 1, keyword = '', size = 20) => {
      if (!confedId) return;
      setTabLoading(true);
      try {
        const query = { page: page - 1, size, keyword };
        if (tab === 'NATIONS') {
          const data = await fetchNationsByContinent(confedId, query);
          const list = Array.isArray(data) ? data : (data as any)?.content || [];
          setNations(list);
          const total = Number((data as any)?.totalElements ?? (data as any)?.total ?? list.length);
          setTotalNationsRecords(total);
        } else {
          const data = await fetchIntCompetitions(confedId, query);
          const list = Array.isArray(data) ? data : (data as any)?.content || [];
          setIntComps(list);
          const total = Number((data as any)?.totalElements ?? (data as any)?.total ?? list.length);
          setTotalIntCompsRecords(total);
        }
      } catch (err: any) {
        console.error('Failed to load confederation tab data:', err);
        message.error(err.message || 'Failed to load records');
      } finally {
        setTabLoading(false);
        setLoading(false);
      }
    },
    [confedId],
  );

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setLoading(true);
      await loadConfedInfo();
      if (activeTab !== 'INFO') {
        await loadTabData(activeTab, currentPage, searchKeyword, pageSize);
      }
      if (isMounted) {
        setLoading(false);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [confedId, activeTab, refreshSignal]);

  useEffect(() => {
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    const effSize = newPageSize && newPageSize !== pageSize ? newPageSize : pageSize;
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
    setCurrentPage(newPage);
    if (activeTab !== 'INFO') {
      loadTabData(activeTab, newPage, searchKeyword, effSize);
    }
  };

  const handleSearchSubmit = () => {
    const kw = searchInput.trim();
    setSearchKeyword(kw);
    setCurrentPage(1);
    if (activeTab !== 'INFO') {
      loadTabData(activeTab, 1, kw, pageSize);
    }
  };

  const handleSwitchTab = (key: string) => {
    const tabKey = key as 'NATIONS' | 'INT_COMPETITIONS' | 'INFO';
    setActiveTab(tabKey);
    setSearchInput('');
    setSearchKeyword('');
    setCurrentPage(1);
    if (tabKey !== 'INFO') {
      loadTabData(tabKey, 1, '', pageSize);
    }
  };

  const handleNavigate = (step: any) => {
    if (step.level === 'NATION_HUB' || step.level === 'NATIONS' || step.type === 'nation') {
      router.push(`/nation/${step.id}`);
    } else if (
      step.level === 'CLUBS_IN_COMP' ||
      step.level === 'INT_COMPETITIONS' ||
      step.type === 'competition'
    ) {
      router.push(`/comp/${step.id}`);
    }
  };

  const currentTotal = activeTab === 'NATIONS' ? totalNationsRecords : totalIntCompsRecords;

  const serverPagination = {
    current: currentPage,
    pageSize,
    total: currentTotal,
    onChange: handlePageChange,
  };

  const nationsCount = confederation?.totalNations ?? totalNationsRecords;
  const compsCount = confederation?.totalIntComps ?? totalIntCompsRecords;

  return (
    <div>
      {/* Main Container Body */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-5 shadow-2xs min-h-[480px]">
        {loading ? (
          <div className="text-center py-16 text-sm text-gray-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading data...</span>
          </div>
        ) : (
          <div>
            {/* Tabs: Countries vs International Competitions */}
            <Tabs
              activeKey={activeTab}
              onChange={handleSwitchTab}
              type="line"
              items={(() => {
                const list: any[] = [];

                list.push({
                  key: 'INFO',
                  label: (
                    <div className="flex items-center gap-2">
                      <TabIconBadge
                        icon={<InfoCircleOutlined className={activeTab === 'INFO' ? 'text-white' : 'text-slate-600'} />}
                        isActive={activeTab === 'INFO'}
                      />
                      <span className={activeTab === 'INFO' ? 'font-bold' : ''}>
                        Info
                      </span>
                    </div>
                  ),
                });

                if (nationsCount > 0) {
                  list.push({
                    key: 'NATIONS',
                    label: (
                      <div className="flex items-center gap-2" title="Countries">
                        <TabIconBadge
                          icon={<NationIcon size={16} className={activeTab === 'NATIONS' ? 'text-white' : 'text-cyan-600'} />}
                          count={nationsCount}
                          isActive={activeTab === 'NATIONS'}
                        />
                        <span
                          className={`hidden sm:inline ${activeTab === 'NATIONS' ? 'font-semibold' : ''}`}
                        >
                          Countries
                        </span>
                      </div>
                    ),
                  });
                }

                if (compsCount > 0) {
                  list.push({
                    key: 'INT_COMPETITIONS',
                    label: (
                      <div className="flex items-center gap-2" title="International Competitions">
                        <TabIconBadge
                          icon={<IntCompIcon size={16} className={activeTab === 'INT_COMPETITIONS' ? 'text-white' : 'text-purple-600'} />}
                          count={compsCount}
                          isActive={activeTab === 'INT_COMPETITIONS'}
                        />
                        <span
                          className={`hidden sm:inline ${activeTab === 'INT_COMPETITIONS' ? 'font-semibold' : ''}`}
                        >
                          International Competitions
                        </span>
                      </div>
                    ),
                  });
                }

                return list;
              })()}
              className="mb-4"
            />

            {/* Tab 1: Countries (Nations) */}
            {activeTab === 'NATIONS' && (
              <div>
                <div className="flex justify-end mb-4">
                  <Space.Compact className="w-full">
                    <Input
                      placeholder="Search countries..."
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        if (e.target.value === '' && searchKeyword !== '') {
                          setSearchKeyword('');
                          setCurrentPage(1);
                          loadTabData('NATIONS', 1, '', pageSize);
                        }
                      }}
                      onPressEnter={handleSearchSubmit}
                      allowClear
                    />
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={handleSearchSubmit}
                      title="Search"
                      className="shrink-0 bg-blue-600"
                    />
                  </Space.Compact>
                </div>

                <CardGrid
                  items={nations}
                  type={EntityType.NATION}
                  cardSize="small"
                  loading={tabLoading}
                  serverPagination={serverPagination}
                  onNavigate={handleNavigate}
                  emptyText="No countries found"
                  defaultPageSize={20}
                />
              </div>
            )}

            {/* Tab 2: International Competitions */}
            {activeTab === 'INT_COMPETITIONS' && (
              <div>
                <CompetitionGroupView
                  items={intComps}
                  loading={tabLoading}
                  onNavigate={handleNavigate}
                  onEdit={(rec) => openRecordModal(RecordType.COMPETITION, rec, undefined, confedId)}
                  emptyText="No international competitions found"
                  serverPagination={serverPagination}
                  extraRight={
                    <div className="flex items-center gap-2 w-full">
                      <Space.Compact className="flex-1 min-w-0">
                        <Input
                          placeholder="Search competitions..."
                          value={searchInput}
                          onChange={(e) => {
                            setSearchInput(e.target.value);
                            if (e.target.value === '' && searchKeyword !== '') {
                              setSearchKeyword('');
                              setCurrentPage(1);
                              loadTabData('INT_COMPETITIONS', 1, '', pageSize);
                            }
                          }}
                          onPressEnter={handleSearchSubmit}
                          allowClear
                        />
                        <Button
                          type="primary"
                          icon={<SearchOutlined />}
                          onClick={handleSearchSubmit}
                          title="Search"
                          className="shrink-0 bg-blue-600"
                        />
                      </Space.Compact>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openRecordModal(RecordType.COMPETITION, null, undefined, confedId)}
                        style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                        className="shrink-0"
                        title="Add International Competition"
                      />
                    </div>
                  }
                />
              </div>
            )}

            {/* Tab: Confederation Information */}
            {activeTab === 'INFO' && confederation && (
              <RecordDetailView
                data={confederation}
                type={EntityType.CONFEDERATION}
                counts={{
                  totalNations: nationsCount,
                  totalIntComps: compsCount,
                }}
                onSwitchTab={(tab) => handleSwitchTab(tab)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfederationDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-400">Loading confederation...</div>}
    >
      <ConfederationDetailContent />
    </Suspense>
  );
}
