'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Tabs,
  Button,
  Input,
  Tag,
  Badge,
  Space,
  Breadcrumb,
  message,
  Tooltip,
  Popconfirm,
  type TableColumnsType,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SyncOutlined,
  TrophyOutlined,
  SafetyOutlined,
  EnvironmentOutlined,
  BankOutlined,
  StarOutlined,
  GlobalOutlined,
  DeleteOutlined,
  EditOutlined,
  UserOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import {
  fetchContinents,
  fetchNationsByContinent,
  fetchIntCompetitions,
  fetchNationHub,
  fetchDomesticCompetitions,
  fetchIndependentClubs,
  fetchClubsInComp,
  fetchCompetitionInfo,
  fetchStadiums,
  fetchCities,
  fetchAwards,
  fetchAwardsInComp,
  fetchPlayers,
  fetchStages,
  fetchAllAwards,
  deleteRecord,
  getExportUrl,
  reimportLnc,
  ConfederationItem,
  NationItem,
  CompetitionItem,
  NationHubData,
  getConfederationLogoUrl,
  getNationLogoUrl,
} from '../services/api';
import RecordModal from '../components/RecordModal';
import QuickSearchModal from '../components/QuickSearchModal';
import CardGrid from '../components/CardGrid';
import CompetitionGroupView, { sortCompetitionsByCategory } from '../components/CompetitionGroupView';
import CityGroupView from '../components/CityGroupView';
import { CompIcon, StadiumIcon, CityIcon, AwardIcon } from '../components/EntityIcons';
import { useApp } from '../context/AppContext';
import {
  HierarchyLevel,
  HierarchyLevelValue,
  NationTabKey,
  NationTabKeyValue,
  RecordType,
  RecordTypeValue,
  EntityType,
  EntityTypeValue,
} from '../types';

interface NavStep {
  level: HierarchyLevelValue;
  id?: string;
  title: string;
  metadata?: any;
}

export default function LncSortitoutsiExplorer() {
  const router = useRouter();
  const {
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
    refreshSignal,
  } = useApp();

  const [navStack, setNavStack] = useState<NavStep[]>([
    { level: HierarchyLevel.CONTINENTS, title: 'HOME' },
  ]);
  const [tableFilter, setTableFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Tab state for Nation view
  const [activeNationTab, setActiveNationTab] = useState<NationTabKeyValue>(NationTabKey.DOMESTIC_COMPS);
  const [nationTabLoading, setNationTabLoading] = useState(false);

  // Search modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Data states
  const [continents, setContinents] = useState<ConfederationItem[]>([]);
  const [nations, setNations] = useState<NationItem[]>([]);
  const [intComps, setIntComps] = useState<CompetitionItem[]>([]);
  const [nationHub, setNationHub] = useState<NationHubData | null>(null);
  const [detailRecords, setDetailRecords] = useState<any[]>([]);
  const [compInfo, setCompInfo] = useState<(CompetitionItem & { clubsCount: number; awardsCount: number }) | null>(null);

  // CRUD modal state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordModalType, setRecordModalType] = useState<RecordTypeValue>(RecordType.CLUB);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);

  const currentStep = navStack[navStack.length - 1];

  const pushStep = useCallback((step: NavStep) => {
    setTableFilter('');
    setNavStack((prev) => [...prev, step]);
  }, []);

  const jumpTo = (index: number) => {
    setTableFilter('');
    setNavStack(navStack.slice(0, index + 1));
  };

  // Load records for active Nation tab
  const loadNationDataForTab = useCallback(
    async (nationId: string, tabKey: NationTabKeyValue) => {
      setNationTabLoading(true);
      try {
        let data: any[] = [];
        if (tabKey === NationTabKey.DOMESTIC_COMPS) {
          data = await fetchDomesticCompetitions(nationId);
        } else if (tabKey === NationTabKey.STADIUMS) {
          data = await fetchStadiums(nationId);
        } else if (tabKey === NationTabKey.CITIES) {
          data = await fetchCities(nationId);
        } else if (tabKey === NationTabKey.AWARDS) {
          data = await fetchAwards(nationId);
        }
        setDetailRecords(data);
        setNationHub((prev) => {
          if (!prev) return prev;
          const keyMap: Record<string, keyof typeof prev.counts> = {
            [NationTabKey.DOMESTIC_COMPS]: 'domesticComps',
            [NationTabKey.STADIUMS]: 'stadiums',
            [NationTabKey.CITIES]: 'cities',
            [NationTabKey.AWARDS]: 'awards',
          };
          const countKey = keyMap[tabKey];
          if (countKey && prev.counts[countKey] !== data.length) {
            return {
              ...prev,
              counts: {
                ...prev.counts,
                [countKey]: data.length,
              },
            };
          }
          return prev;
        });
      } catch (err: any) {
        console.error(err);
        message.error(err.message || 'Failed to load tab data');
      } finally {
        setNationTabLoading(false);
      }
    },
    [],
  );

  // Switch Nation tab
  const handleSwitchNationTab = async (tabKey: NationTabKeyValue) => {
    setActiveNationTab(tabKey);
    setTableFilter('');
    setDetailRecords([]);
    if (currentStep.id !== undefined) {
      await loadNationDataForTab(String(currentStep.id), tabKey);
    }
  };

  // Switch Competition tab (Clubs vs Awards)
  const handleSwitchCompTab = (targetLevel: 'CLUBS_IN_COMP' | 'COMP_AWARDS') => {
    if (currentStep.level === targetLevel) return;
    setTableFilter('');
    setNavStack((prev) => {
      const copy = [...prev];
      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        level: targetLevel as HierarchyLevelValue,
        title: copy[copy.length - 1].title.replace(/ - (Clubs|Awards)$/, ''),
      };
      return copy;
    });
  };

  // Load level data
  const loadCurrentLevelData = useCallback(async () => {
    setLoading(true);
    try {
      if (currentStep.level === 'CONTINENTS') {
        const data = await fetchContinents();
        setContinents(data);
      } else if (currentStep.level === 'NATIONS' && currentStep.id !== undefined) {
        const data = await fetchNationsByContinent(String(currentStep.id));
        setNations(data);
      } else if (currentStep.level === 'INT_COMPETITIONS' && currentStep.id !== undefined) {
        const data = await fetchIntCompetitions(String(currentStep.id));
        setIntComps(data);
      } else if (currentStep.level === 'NATION_HUB' && currentStep.id !== undefined) {
        const hub = await fetchNationHub(String(currentStep.id));
        setNationHub(hub);

        // Auto select tab that has count > 0
        let targetTab: NationTabKeyValue = activeNationTab;
        const countForActive =
          targetTab === NationTabKey.DOMESTIC_COMPS
            ? hub.counts.domesticComps
            : targetTab === NationTabKey.STADIUMS
            ? hub.counts.stadiums
            : targetTab === NationTabKey.CITIES
            ? hub.counts.cities
            : targetTab === NationTabKey.AWARDS
            ? hub.counts.awards
            : 0;

        if (countForActive === 0) {
          if (hub.counts.domesticComps > 0) targetTab = NationTabKey.DOMESTIC_COMPS;
          else if (hub.counts.awards > 0) targetTab = NationTabKey.AWARDS;
          else if (hub.counts.stadiums > 0) targetTab = NationTabKey.STADIUMS;
          else if (hub.counts.cities > 0) targetTab = NationTabKey.CITIES;
        }
        setActiveNationTab(targetTab);

        const hasAnyChildren = Object.values(hub.counts).some((c: any) => c > 0);
        if (hasAnyChildren) {
          await loadNationDataForTab(String(currentStep.id), targetTab);
        } else {
          setDetailRecords([]);
        }
      } else if (currentStep.level === 'DOMESTIC_COMPS' && currentStep.id !== undefined) {
        const data = await fetchDomesticCompetitions(String(currentStep.id));
        setDetailRecords(data);
      } else if (currentStep.level === 'INDEPENDENT_CLUBS' && currentStep.id !== undefined) {
        const isExtinct = currentStep.metadata?.is_extinct;
        const data = await fetchIndependentClubs(String(currentStep.id), isExtinct);
        setDetailRecords(data);
      } else if (currentStep.level === 'CLUBS_IN_COMP' && currentStep.id !== undefined) {
        const [info, data] = await Promise.all([
          fetchCompetitionInfo(String(currentStep.id)).catch(() => null),
          fetchClubsInComp(String(currentStep.id)),
        ]);
        if (info) setCompInfo(info);
        setDetailRecords(data);
      } else if (currentStep.level === 'STADIUMS' && currentStep.id !== undefined) {
        const data = await fetchStadiums(String(currentStep.id));
        setDetailRecords(data);
      } else if (currentStep.level === 'CITIES' && currentStep.id !== undefined) {
        const data = await fetchCities(String(currentStep.id));
        setDetailRecords(data);
      } else if (currentStep.level === 'INDEPENDENT_AWARDS' && currentStep.id !== undefined) {
        const data = await fetchAwards(String(currentStep.id));
        setDetailRecords(data);
      } else if (currentStep.level === 'COMP_AWARDS' && currentStep.id !== undefined) {
        const [info, data] = await Promise.all([
          fetchCompetitionInfo(String(currentStep.id)).catch(() => null),
          fetchAwardsInComp(String(currentStep.id)),
        ]);
        if (info) setCompInfo(info);
        setDetailRecords(data);
      } else if (currentStep.level === 'GLOBAL_PLAYERS') {
        const data = await fetchPlayers();
        setDetailRecords(data);
      } else if (currentStep.level === 'GLOBAL_STAGES') {
        const data = await fetchStages();
        setDetailRecords(data);
      } else if (currentStep.level === 'GLOBAL_AWARDS') {
        const data = await fetchAllAwards();
        setDetailRecords(data);
      }
    } catch (e: any) {
      console.error(e);
      message.error(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [currentStep, activeNationTab, loadNationDataForTab]);

  useEffect(() => {
    loadCurrentLevelData();
  }, [loadCurrentLevelData, refreshSignal]);

  // Determine current record type for CRUD
  const currentRecordType = useMemo((): RecordType => {
    if (currentStep.level === HierarchyLevel.NATION_HUB) {
      switch (activeNationTab) {
        case NationTabKey.DOMESTIC_COMPS:
          return RecordType.COMPETITION;
        case NationTabKey.STADIUMS:
          return RecordType.STADIUM;
        case NationTabKey.CITIES:
          return RecordType.CITY;
        case NationTabKey.AWARDS:
          return RecordType.AWARD;
        default:
          return RecordType.COMPETITION;
      }
    }
    switch (currentStep.level) {
      case HierarchyLevel.DOMESTIC_COMPS:
      case HierarchyLevel.INT_COMPETITIONS:
        return RecordType.COMPETITION;
      case HierarchyLevel.INDEPENDENT_CLUBS:
      case HierarchyLevel.CLUBS_IN_COMP:
        return RecordType.CLUB;
      case HierarchyLevel.STADIUMS:
        return RecordType.STADIUM;
      case HierarchyLevel.CITIES:
        return RecordType.CITY;
      case HierarchyLevel.INDEPENDENT_AWARDS:
      case HierarchyLevel.COMP_AWARDS:
      case HierarchyLevel.GLOBAL_AWARDS:
        return RecordType.AWARD;
      case HierarchyLevel.GLOBAL_PLAYERS:
        return RecordType.PLAYER;
      case HierarchyLevel.GLOBAL_STAGES:
        return RecordType.STAGE;
      default:
        return RecordType.CLUB;
    }
  }, [currentStep.level, activeNationTab]);

  // Direct Delete via Popconfirm
  const handleDeleteDirect = async (record: any) => {
    try {
      await deleteRecord(currentRecordType, String(record.id));
      message.success('Record deleted successfully!');
      if (currentStep.level === 'NATION_HUB' && currentStep.id !== undefined) {
        const hub = await fetchNationHub(String(currentStep.id));
        setNationHub(hub);
        await loadNationDataForTab(String(currentStep.id), activeNationTab);
      } else {
        loadCurrentLevelData();
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete record');
    }
  };

  // Filtered view data with ID ascending sorting
  const filteredContinents = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    return continents
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          String(c.id).includes(q),
      )
      .sort((a, b) => Number(a.id) - Number(b.id));
  }, [continents, tableFilter]);

  // Continents Table Columns definition
  const continentColumns: TableColumnsType<ConfederationItem> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 150,
        align: 'left',
        sorter: (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }),
        render: (id: string) => (
          <Tag color="blue" className="font-mono font-semibold m-0">
            {id}
          </Tag>
        ),
      },
      {
        title: 'Confederation',
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (name: string, record: ConfederationItem) => (
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
              <img
                src={getConfederationLogoUrl(record.id)}
                alt={name}
                className="w-8 h-8 object-contain rounded bg-white p-0.5 border border-slate-200 shadow-2xs"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <span
                style={{ display: 'none' }}
                className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 items-center justify-center text-xs font-bold text-blue-700 shrink-0"
              >
                {name ? name[0] : 'C'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/confederation/${record.id}`)}
              className="font-bold text-sm text-[#1d70b8] hover:underline text-left hover:text-blue-700 transition cursor-pointer"
            >
              {name}
            </button>
          </div>
        ),
      },
      {
        title: 'Countries',
        dataIndex: 'totalNations',
        key: 'totalNations',
        sorter: (a, b) => (a.totalNations || 0) - (b.totalNations || 0),
        render: (count: number, record: ConfederationItem) => {
          if (count > 0) {
            return (
              <Tooltip title={`View countries in ${record.name}`}>
                <Button
                  type="text"
                  size="small"
                  onClick={() => router.push(`/confederation/${record.id}`)}
                  className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md hover:bg-sky-50 text-sky-700 font-medium border border-sky-100"
                >
                  <GlobalOutlined className="text-sky-600 text-sm" />
                  <span>{count} countries</span>
                </Button>
              </Tooltip>
            );
          }
          return <span className="text-gray-400 text-xs italic">0 countries</span>;
        },
      },
      {
        title: 'International Competitions',
        dataIndex: 'totalIntComps',
        key: 'totalIntComps',
        sorter: (a, b) => (a.totalIntComps || 0) - (b.totalIntComps || 0),
        render: (count: number, record: ConfederationItem) => {
          if (count > 0) {
            return (
              <Tooltip title={`View competitions in ${record.name}`}>
                <Button
                  type="text"
                  size="small"
                  onClick={() => router.push(`/confederation/${record.id}?tab=int`)}
                  className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md hover:bg-emerald-50 text-emerald-700 font-medium border border-emerald-100"
                >
                  <TrophyOutlined className="text-emerald-600 text-sm" />
                  <span>{count} competitions</span>
                </Button>
              </Tooltip>
            );
          }
          return <span className="text-gray-400 text-xs italic">0 competitions</span>;
        },
      },
    ],
    [router],
  );

  const filteredNations = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    return nations
      .filter(
        (n) =>
          !q ||
          n.long_name.toLowerCase().includes(q) ||
          n.short_name.toLowerCase().includes(q) ||
          n.three_letter_name.toLowerCase().includes(q) ||
          String(n.id).includes(q),
      )
      .sort((a, b) =>
        (a.long_name || a.short_name || '').localeCompare(
          b.long_name || b.short_name || '',
          undefined,
          { numeric: true, sensitivity: 'base' },
        ),
      );
  }, [nations, tableFilter]);

  const filteredIntComps = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    return intComps
      .filter(
        (c) =>
          !q ||
          c.long_name.toLowerCase().includes(q) ||
          c.short_name.toLowerCase().includes(q) ||
          (c.three_letter_name && c.three_letter_name.toLowerCase().includes(q)) ||
          String(c.id).includes(q),
      )
      .sort(sortCompetitionsByCategory);
  }, [intComps, tableFilter]);

  const filteredDetailRecords = useMemo(() => {
    let list = detailRecords;
    if (tableFilter.trim()) {
      const q = tableFilter.toLowerCase();
      list = list.filter((item) => {
        const name = item.name || item.long_name || '';
        const sname = item.short_name || '';
        const fname = item.first_name || '';
        const lname = item.second_name || '';
        const cname = item.common_name || '';
        const fullName = `${fname} ${lname}`.trim();
        const code3 = item.three_letter_name || '';
        const code6 = item.six_letter_name || '';
        const note = item.note || item.categories || '';
        const idStr = String(item.id);
        return (
          name.toLowerCase().includes(q) ||
          sname.toLowerCase().includes(q) ||
          fname.toLowerCase().includes(q) ||
          lname.toLowerCase().includes(q) ||
          cname.toLowerCase().includes(q) ||
          fullName.toLowerCase().includes(q) ||
          code3.toLowerCase().includes(q) ||
          code6.toLowerCase().includes(q) ||
          note.toLowerCase().includes(q) ||
          idStr.includes(q)
        );
      });
    }

    if (
      currentStep.level === 'DOMESTIC_COMPS' ||
      currentStep.level === 'INT_COMPETITIONS' ||
      (currentStep.level === 'NATIONS' && activeNationTab === 'domesticComps') ||
      currentRecordType === 'competition'
    ) {
      return [...list].sort(sortCompetitionsByCategory);
    }

    return [...list].sort((a, b) => {
      const nameA = a.name || a.long_name || a.short_name || `${a.first_name || ''} ${a.second_name || ''}`.trim() || '';
      const nameB = b.name || b.long_name || b.short_name || `${b.first_name || ''} ${b.second_name || ''}`.trim() || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [detailRecords, tableFilter, currentStep.level, activeNationTab, currentRecordType]);

  // Configuration of tabs for Nation Hub (100% English, no Vietnamese subtitles)
  const nationTabsConfig = useMemo(() => {
    return [
      {
        key: NationTabKey.DOMESTIC_COMPS,
        label: 'Competitions',
        count: nationHub?.counts?.domesticComps || 0,
        icon: <CompIcon size={18} className="text-amber-500" />,
        addLabel: 'Add Competition',
        type: RecordType.COMPETITION,
      },
      {
        key: NationTabKey.STADIUMS,
        label: 'Stadiums',
        count: nationHub?.counts?.stadiums || 0,
        icon: <StadiumIcon size={18} className="text-emerald-500" />,
        addLabel: 'Add Stadium',
        type: RecordType.STADIUM,
      },
      {
        key: NationTabKey.CITIES,
        label: 'Cities',
        count: nationHub?.counts?.cities || 0,
        icon: <CityIcon size={18} className="text-indigo-500" />,
        addLabel: 'Add City',
        type: RecordType.CITY,
      },
      {
        key: NationTabKey.AWARDS,
        label: 'Awards',
        count: nationHub?.counts?.awards || 0,
        icon: <AwardIcon size={18} className="text-yellow-500" />,
        addLabel: 'Add Award',
        type: RecordType.AWARD,
      },
    ];
  }, [nationHub]);

  // Hide any tab that has 0 records; fallback to Competitions tab if all are 0
  const visibleNationTabs = useMemo(() => {
    const list = nationTabsConfig.filter((t) => t.count > 0);
    if (list.length === 0) {
      return nationTabsConfig.slice(0, 1);
    }
    return list;
  }, [nationTabsConfig]);

  // Ensure activeNationTab is in visibleNationTabs
  useEffect(() => {
    if (visibleNationTabs.length > 0 && !visibleNationTabs.some((t) => t.key === activeNationTab)) {
      handleSwitchNationTab(visibleNationTabs[0].key);
    }
  }, [visibleNationTabs, activeNationTab]);

  const currentNationTabObj = useMemo(() => {
    return nationTabsConfig.find((t) => t.key === activeNationTab);
  }, [nationTabsConfig, activeNationTab]);

  // Sync header context with active navigation
  useEffect(() => {
    setHeaderTitle(currentStep.title);
    setHeaderId(currentStep.id);
    setBreadcrumbs(
      navStack.map((step, idx) => ({
        title: step.title,
        onClick: idx === navStack.length - 1 ? undefined : () => jumpTo(idx),
      })),
    );
    setBackHref(navStack.length > 1 ? () => jumpTo(navStack.length - 2) : null);

    if (currentStep.level === HierarchyLevel.NATION_HUB && currentStep.id) {
      setHeaderLogo({
        url: getNationLogoUrl(currentStep.id, currentStep.metadata?.three_letter_name),
        isFlag: true,
        alt: currentStep.title,
      });
    } else if (
      currentStep.id &&
      (currentStep.level === HierarchyLevel.NATIONS ||
        currentStep.level === HierarchyLevel.INT_COMPETITIONS)
    ) {
      setHeaderLogo({
        url: getConfederationLogoUrl(currentStep.id),
        isFlag: false,
        alt: currentStep.title,
      });
    } else {
      setHeaderLogo(null);
    }
  }, [currentStep, navStack, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  useEffect(() => {
    return () => {
      setBreadcrumbs([]);
      setBackHref(null);
      setHeaderLogo(null);
      setHeaderId(undefined);
    };
  }, [setBreadcrumbs, setBackHref, setHeaderLogo, setHeaderId]);

  return (
    <div>
      {/* Main Content Body */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-5 shadow-2xs min-h-[480px]">
          {loading && (
            <div className="text-center py-16 text-sm text-gray-500 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading data...</span>
            </div>
          )}

          {/* 1. CONFEDERATIONS */}
          {!loading && currentStep.level === 'CONTINENTS' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-700">Confederations</h2>
                  <span className="text-xs text-gray-500">
                    Total: <strong className="text-gray-800">{filteredContinents.length}</strong> confederations
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Filter confederations..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    allowClear
                    className="flex-1 sm:w-64"
                  />
                </div>
              </div>

              {/* Mobile Cards (md:hidden) - 2 cards per row */}
              <div className="md:hidden grid grid-cols-2 gap-2 sm:gap-3">
                {filteredContinents.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/confederation/${c.id}`)}
                    className="bg-white border border-gray-200 hover:border-blue-400 active:bg-slate-50 rounded-lg p-2 sm:p-3 shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-1.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <Tag color="blue" className="font-mono font-bold text-[10px] m-0 shrink-0 px-1 py-0">
                          {c.id}
                        </Tag>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img
                          src={getConfederationLogoUrl(c.id)}
                          alt={c.name}
                          className="w-6 h-6 object-contain rounded bg-white shadow-2xs border border-slate-200 shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="font-bold text-xs text-slate-800 line-clamp-1" title={c.name}>{c.name}</div>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 text-[11px] space-y-0.5 text-slate-600">
                      <div className="flex items-center gap-1 truncate">
                        <GlobalOutlined className="text-blue-500 text-xs shrink-0" />
                        <span className="truncate"><strong>{c.totalNations || 0}</strong> nations</span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <TrophyOutlined className="text-amber-500 text-xs shrink-0" />
                        <span className="truncate"><strong>{c.totalIntComps || 0}</strong> comps</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (hidden md:block) */}
              <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <Table<ConfederationItem>
                  rowKey="id"
                  columns={continentColumns}
                  dataSource={filteredContinents}
                  loading={loading}
                  pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                    showTotal: (total, range) =>
                      `Showing ${range[0]} - ${range[1]} of ${total} records`,
                    size: 'small',
                  }}
                  scroll={{ x: 'max-content' }}
                  size="middle"
                />
              </div>
            </div>
          )}

          {/* 2. INTERNATIONAL COMPETITIONS */}
          {!loading && currentStep.level === 'INT_COMPETITIONS' && (
            <div>
              {/* Tabs switcher if confed has both countries and int comps */}
              {(() => {
                const currentConfed = continents.find((c) => c.id === currentStep.id);
                if (!currentConfed || (currentConfed.totalNations || 0) === 0) return null;
                return (
                  <Tabs
                    activeKey="INT_COMPETITIONS"
                    onChange={(key) => {
                      setTableFilter('');
                      setNavStack((prev) => [
                        ...prev.slice(0, -1),
                        {
                          level: key as HierarchyLevel,
                          id: currentConfed.id,
                          title: currentConfed.name,
                        },
                      ]);
                    }}
                    items={[
                      {
                        key: 'NATIONS',
                        label: (
                          <Space size={4} title="Countries">
                            <GlobalOutlined />
                            <span className="hidden sm:inline">Countries</span>
                            <Badge
                              count={currentConfed.totalNations}
                              overflowCount={99999}
                              style={{ backgroundColor: '#94a3b8' }}
                            />
                          </Space>
                        ),
                      },
                      {
                        key: 'INT_COMPETITIONS',
                        label: (
                          <Space size={4} title="International Competitions">
                            <TrophyOutlined />
                            <span className="hidden sm:inline font-semibold">International Competitions</span>
                            <Badge
                              count={currentConfed.totalIntComps}
                              overflowCount={99999}
                              style={{ backgroundColor: '#10b981' }}
                            />
                          </Space>
                        ),
                      },
                    ]}
                    className="mb-4"
                  />
                );
              })()}

              <CompetitionGroupView
                items={filteredIntComps}
                loading={loading}
                onNavigate={pushStep}
                onEdit={(rec) => {
                  setEditingRecord(rec);
                  setRecordModalType('competition');
                  setIsRecordModalOpen(true);
                }}
                onDelete={handleDeleteDirect}
                emptyText="No international competitions found"
                extraRight={
                  <>
                    <Input
                      prefix={<SearchOutlined className="text-gray-400" />}
                      placeholder="Filter competitions..."
                      value={tableFilter}
                      onChange={(e) => setTableFilter(e.target.value)}
                      allowClear
                      className="w-48 sm:w-64"
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingRecord(null);
                        setRecordModalType('competition');
                        setIsRecordModalOpen(true);
                      }}
                      style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                      className="shrink-0"
                      title="Add International Competition"
                    >
                      <span className="hidden sm:inline">Add International Competition</span>
                    </Button>
                  </>
                }
              />
            </div>
          )}

          {/* 3. COUNTRIES (NATIONS) */}
          {!loading && currentStep.level === 'NATIONS' && (
            <div>
              {/* Tabs switcher if confed has both countries and int comps */}
              {(() => {
                const currentConfed = continents.find((c) => c.id === currentStep.id);
                if (!currentConfed || (currentConfed.totalIntComps || 0) === 0) return null;
                return (
                  <Tabs
                    activeKey="NATIONS"
                    onChange={(key) => {
                      setTableFilter('');
                      setNavStack((prev) => [
                        ...prev.slice(0, -1),
                        {
                          level: key as HierarchyLevel,
                          id: currentConfed.id,
                          title: currentConfed.name,
                        },
                      ]);
                    }}
                    items={[
                      {
                        key: 'NATIONS',
                        label: (
                          <Space size={4} title="Countries">
                            <GlobalOutlined />
                            <span className="hidden sm:inline font-semibold">Countries</span>
                            <Badge
                              count={currentConfed.totalNations}
                              overflowCount={99999}
                              style={{ backgroundColor: '#1d70b8' }}
                            />
                          </Space>
                        ),
                      },
                      {
                        key: 'INT_COMPETITIONS',
                        label: (
                          <Space size={4} title="International Competitions">
                            <TrophyOutlined />
                            <span className="hidden sm:inline">International Competitions</span>
                            <Badge
                              count={currentConfed.totalIntComps}
                              overflowCount={99999}
                              style={{ backgroundColor: '#94a3b8' }}
                            />
                          </Space>
                        ),
                      },
                    ]}
                    className="mb-4"
                  />
                );
              })()}

              <div className="flex justify-end mb-4">
                <Input
                  prefix={<SearchOutlined className="text-gray-400" />}
                  placeholder="Filter countries..."
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  allowClear
                  className="w-full sm:w-64"
                />
              </div>

              <CardGrid
                items={filteredNations}
                type={EntityType.NATION}
                columns={5}
                loading={loading}
                onNavigate={(step) => router.push(`/nation/${step.id}`)}
                emptyText="No countries found"
                defaultPageSize={20}
              />
            </div>
          )}

          {/* 4. NATION HUB (TABS WITH ANTD PAGINATED TABLE) */}
          {!loading && currentStep.level === 'NATION_HUB' && nationHub && (
            <div>
              {/* Header & Country Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-gray-800 flex items-center gap-2.5">
                    <img
                      src={getNationLogoUrl(nationHub.nation?.id, nationHub.nation?.three_letter_name)}
                      alt={currentStep.title}
                      className="w-8 h-5.5 object-cover rounded shadow-2xs border border-slate-300 shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span>{currentStep.title}</span>
                    <Tag color="cyan" className="font-bold m-0">
                      ID: {nationHub.nation?.id}
                    </Tag>
                  </h2>
                </div>
              </div>

              {/* If no children exist */}
              {visibleNationTabs.length === 0 ? (
                <div className="text-center py-16 text-gray-400 italic">
                  No child records available for this country.
                </div>
              ) : (
                <div>
                  {/* ANTD TABS */}
                  <Tabs
                    activeKey={activeNationTab}
                    onChange={(key) => handleSwitchNationTab(key as NationTabKey)}
                    type="line"
                    size="middle"
                    className="mb-2"
                    items={visibleNationTabs.map((tab) => ({
                      key: tab.key,
                      label: (
                        <Space size={4} title={tab.label}>
                          {tab.icon}
                          <span className="hidden sm:inline font-semibold text-xs sm:text-sm">{tab.label}</span>
                          <Badge
                            count={tab.count}
                            overflowCount={99999}
                            style={{
                              backgroundColor: activeNationTab === tab.key ? '#1d70b8' : '#94a3b8',
                            }}
                          />
                        </Space>
                      ),
                    }))}
                  />

                  {/* ACTIVE TAB CONTENT */}
                  <div className="mt-2">
                    {/* Header bar: Filter & Add button for tabs without built-in group toolbar */}
                    {activeNationTab !== NationTabKey.DOMESTIC_COMPS && activeNationTab !== NationTabKey.CITIES && (
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4">
                        <div className="text-xs text-gray-500">
                          Category: <strong className="text-gray-800">{currentNationTabObj?.label}</strong> ({filteredDetailRecords.length} records)
                        </div>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <Input
                            prefix={<SearchOutlined className="text-gray-400" />}
                            placeholder={`Filter ${currentNationTabObj?.label.toLowerCase() || 'records'}...`}
                            value={tableFilter}
                            onChange={(e) => setTableFilter(e.target.value)}
                            allowClear
                            className="flex-1 sm:w-64"
                          />
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            className="shrink-0"
                            onClick={() => {
                              setEditingRecord(null);
                              setRecordModalType(currentRecordType);
                              setIsRecordModalOpen(true);
                            }}
                            title={currentNationTabObj?.addLabel || 'Add Record'}
                          >
                            <span className="hidden sm:inline">{currentNationTabObj?.addLabel || 'Add Record'}</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {activeNationTab === NationTabKey.DOMESTIC_COMPS ? (
                      <CompetitionGroupView
                        items={filteredDetailRecords}
                        loading={nationTabLoading}
                        onNavigate={pushStep}
                        onEdit={(rec) => {
                          setEditingRecord(rec);
                          setRecordModalType(currentRecordType);
                          setIsRecordModalOpen(true);
                        }}
                        onDelete={handleDeleteDirect}
                        emptyText="No competitions found"
                        extraRight={
                          <>
                            <Input
                              prefix={<SearchOutlined className="text-gray-400" />}
                              placeholder="Filter competitions..."
                              value={tableFilter}
                              onChange={(e) => setTableFilter(e.target.value)}
                              allowClear
                              className="w-48 sm:w-64"
                            />
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              className="shrink-0"
                              onClick={() => {
                                setEditingRecord(null);
                                setRecordModalType(currentRecordType);
                                setIsRecordModalOpen(true);
                              }}
                              title={currentNationTabObj?.addLabel || 'Add Competition'}
                            >
                              <span className="hidden sm:inline">{currentNationTabObj?.addLabel || 'Add Competition'}</span>
                            </Button>
                          </>
                        }
                      />
                    ) : activeNationTab === NationTabKey.CITIES ? (
                      <CityGroupView
                        items={filteredDetailRecords}
                        loading={nationTabLoading}
                        onNavigate={pushStep}
                        onEdit={(rec) => {
                          setEditingRecord(rec);
                          setRecordModalType(currentRecordType);
                          setIsRecordModalOpen(true);
                        }}
                        onDelete={handleDeleteDirect}
                        emptyText="No cities found"
                        extraRight={
                          <>
                            <Input
                              prefix={<SearchOutlined className="text-gray-400" />}
                              placeholder="Filter cities..."
                              value={tableFilter}
                              onChange={(e) => setTableFilter(e.target.value)}
                              allowClear
                              className="w-48 sm:w-64"
                            />
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              className="shrink-0"
                              onClick={() => {
                                setEditingRecord(null);
                                setRecordModalType(currentRecordType);
                                setIsRecordModalOpen(true);
                              }}
                              title={currentNationTabObj?.addLabel || 'Add City'}
                            >
                              <span className="hidden sm:inline">{currentNationTabObj?.addLabel || 'Add City'}</span>
                            </Button>
                          </>
                        }
                      />
                    ) : (
                      <CardGrid
                        items={filteredDetailRecords}
                        type={currentRecordType}
                        loading={nationTabLoading}
                        onNavigate={pushStep}
                        onEdit={(rec) => {
                          setEditingRecord(rec);
                          setRecordModalType(currentRecordType);
                          setIsRecordModalOpen(true);
                        }}
                        onDelete={handleDeleteDirect}
                        emptyText={`No ${currentNationTabObj?.label.toLowerCase() || 'records'} found`}
                        defaultPageSize={20}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. DETAILED TABLE (SECTION 6 LEAF NODES) */}
          {!loading &&
            [
              'DOMESTIC_COMPS',
              'CLUBS_IN_COMP',
              'INDEPENDENT_CLUBS',
              'STADIUMS',
              'CITIES',
              'INDEPENDENT_AWARDS',
              'COMP_AWARDS',
              'GLOBAL_PLAYERS',
              'GLOBAL_STAGES',
              'GLOBAL_AWARDS',
            ].includes(currentStep.level) && (
              <div>
                {(currentStep.level === 'CLUBS_IN_COMP' || currentStep.level === 'COMP_AWARDS') ? (
                  <div className="bg-white rounded-lg border border-slate-200 p-3.5 sm:p-4 mb-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        {compInfo?.nation ? (
                          <img
                            src={getNationLogoUrl(compInfo.nation.id, compInfo.nation.three_letter_name)}
                            alt={compInfo.nation.short_name || compInfo.nation.long_name}
                            className="w-8 h-6 object-cover rounded-xs border border-slate-200 shadow-2xs shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (compInfo?.confederation?.id || compInfo?.confed_id) ? (
                          <img
                            src={getConfederationLogoUrl(compInfo.confederation?.id || compInfo.confed_id!)}
                            alt={compInfo.confederation?.name || 'Confederation'}
                            className="w-8 h-8 object-contain shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <TrophyOutlined className="text-2xl text-amber-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-bold text-slate-800 m-0">
                              {compInfo?.short_name || compInfo?.long_name || currentStep.title.replace(/ - (Clubs|Awards)$/, '')}
                            </h2>
                            {currentStep.id && (
                              <Tag color="cyan" className="m-0 font-bold text-xs">
                                ID: {currentStep.id}
                              </Tag>
                            )}
                            {compInfo?.three_letter_name && (
                              <Tag color="purple" className="m-0 font-bold text-xs">
                                {compInfo.three_letter_name}
                              </Tag>
                            )}
                            {compInfo?.categories && (
                              <Tag color="blue" className="m-0 text-xs">
                                {compInfo.categories}
                              </Tag>
                            )}
                          </div>
                          {compInfo?.long_name && compInfo.long_name !== compInfo.short_name && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {compInfo.long_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Competition Tabs: Clubs vs Awards */}
                    <div className="border-t border-slate-100 mt-3 pt-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSwitchCompTab('CLUBS_IN_COMP')}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition cursor-pointer ${
                            currentStep.level === 'CLUBS_IN_COMP'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <SafetyOutlined />
                          <span>Clubs</span>
                          <Badge
                            count={compInfo?.clubsCount ?? (currentStep.level === 'CLUBS_IN_COMP' ? detailRecords.length : 0)}
                            overflowCount={9999}
                            style={{
                              backgroundColor: currentStep.level === 'CLUBS_IN_COMP' ? '#1d4ed8' : '#64748b',
                              color: '#fff',
                            }}
                          />
                        </button>

                        {((compInfo?.awardsCount || 0) > 0 || currentStep.level === 'COMP_AWARDS') && (
                          <button
                            type="button"
                            onClick={() => handleSwitchCompTab('COMP_AWARDS')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition cursor-pointer ${
                              currentStep.level === 'COMP_AWARDS'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <StarOutlined />
                            <span>Awards</span>
                            <Badge
                              count={compInfo?.awardsCount ?? (currentStep.level === 'COMP_AWARDS' ? detailRecords.length : 0)}
                              overflowCount={9999}
                              style={{
                                backgroundColor: currentStep.level === 'COMP_AWARDS' ? '#d97706' : '#64748b',
                                color: '#fff',
                              }}
                            />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <Input
                          prefix={<SearchOutlined className="text-gray-400" />}
                          placeholder={currentStep.level === 'COMP_AWARDS' ? 'Filter awards...' : 'Filter clubs...'}
                          value={tableFilter}
                          onChange={(e) => setTableFilter(e.target.value)}
                          allowClear
                          className="w-48 sm:w-60"
                        />
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            setEditingRecord(null);
                            setRecordModalType(currentRecordType);
                            setIsRecordModalOpen(true);
                          }}
                          title={currentStep.level === 'COMP_AWARDS' ? 'Add Award' : 'Add Club'}
                        >
                          <span className="hidden sm:inline">
                            {currentStep.level === 'COMP_AWARDS' ? 'Add Award' : 'Add Club'}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : currentStep.level !== 'DOMESTIC_COMPS' && currentStep.level !== 'CITIES' ? (
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-700">
                        Detailed Records: {currentStep.title}
                      </h3>
                      <div className="text-xs text-gray-500">
                        Total: {filteredDetailRecords.length} records
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="Filter records..."
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                        allowClear
                        className="flex-1 sm:w-64"
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        className="shrink-0"
                        onClick={() => {
                          setEditingRecord(null);
                          setRecordModalType(currentRecordType);
                          setIsRecordModalOpen(true);
                        }}
                        title={
                          currentRecordType === RecordType.PLAYER
                            ? 'Add Player'
                            : currentRecordType === RecordType.STAGE
                            ? 'Add Stage'
                            : currentRecordType === RecordType.AWARD
                            ? 'Add Award'
                            : currentRecordType === RecordType.CLUB
                            ? 'Add Club'
                            : currentRecordType === RecordType.COMPETITION
                            ? 'Add Competition'
                            : currentRecordType === RecordType.STADIUM
                            ? 'Add Stadium'
                            : currentRecordType === RecordType.CITY
                            ? 'Add City'
                            : 'Add Record'
                        }
                      >
                        <span className="hidden sm:inline">
                          {currentRecordType === RecordType.PLAYER
                            ? 'Add Player'
                            : currentRecordType === RecordType.STAGE
                            ? 'Add Stage'
                            : currentRecordType === RecordType.AWARD
                            ? 'Add Award'
                            : currentRecordType === RecordType.CLUB
                            ? 'Add Club'
                            : currentRecordType === RecordType.COMPETITION
                            ? 'Add Competition'
                            : currentRecordType === RecordType.STADIUM
                            ? 'Add Stadium'
                            : currentRecordType === RecordType.CITY
                            ? 'Add City'
                            : 'Add Record'}
                        </span>
                      </Button>
                    </div>
                  </div>
                ) : null}

                {currentStep.level === 'DOMESTIC_COMPS' ? (
                  <CompetitionGroupView
                    items={filteredDetailRecords}
                    loading={loading}
                    onNavigate={pushStep}
                    onEdit={(rec) => {
                      setEditingRecord(rec);
                      setRecordModalType(currentRecordType);
                      setIsRecordModalOpen(true);
                    }}
                    onDelete={handleDeleteDirect}
                    emptyText="No competitions found"
                    extraRight={
                      <>
                        <Input
                          prefix={<SearchOutlined className="text-gray-400" />}
                          placeholder="Filter competitions..."
                          value={tableFilter}
                          onChange={(e) => setTableFilter(e.target.value)}
                          allowClear
                          className="w-48 sm:w-64"
                        />
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          className="shrink-0"
                          onClick={() => {
                            setEditingRecord(null);
                            setRecordModalType(currentRecordType);
                            setIsRecordModalOpen(true);
                          }}
                          title="Add Competition"
                        >
                          <span className="hidden sm:inline">Add Competition</span>
                        </Button>
                      </>
                    }
                  />
                ) : currentStep.level === 'CITIES' ? (
                  <CityGroupView
                    items={filteredDetailRecords}
                    loading={loading}
                    onNavigate={pushStep}
                    onEdit={(rec) => {
                      setEditingRecord(rec);
                      setRecordModalType(currentRecordType);
                      setIsRecordModalOpen(true);
                    }}
                    onDelete={handleDeleteDirect}
                    emptyText="No cities found"
                    extraRight={
                      <>
                        <Input
                          prefix={<SearchOutlined className="text-gray-400" />}
                          placeholder="Filter cities..."
                          value={tableFilter}
                          onChange={(e) => setTableFilter(e.target.value)}
                          allowClear
                          className="w-48 sm:w-64"
                        />
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          className="shrink-0"
                          onClick={() => {
                            setEditingRecord(null);
                            setRecordModalType(currentRecordType);
                            setIsRecordModalOpen(true);
                          }}
                          title="Add City"
                        >
                          <span className="hidden sm:inline">Add City</span>
                        </Button>
                      </>
                    }
                  />
                ) : (
                  <CardGrid
                    items={filteredDetailRecords}
                    type={currentRecordType}
                    loading={loading}
                    onNavigate={pushStep}
                    onEdit={(rec) => {
                      setEditingRecord(rec);
                      setRecordModalType(currentRecordType);
                      setIsRecordModalOpen(true);
                    }}
                    onDelete={handleDeleteDirect}
                    emptyText="No records found"
                    defaultPageSize={20}
                  />
                )}
              </div>
            )}
        </div>

      {/* Modals */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={() => {
          message.success('Record saved successfully!');
          if (currentStep.level === 'NATION_HUB' && currentStep.id !== undefined) {
            fetchNationHub(currentStep.id).then(setNationHub);
            loadNationDataForTab(currentStep.id, activeNationTab);
          } else {
            loadCurrentLevelData();
          }
        }}
        type={recordModalType}
        initialData={editingRecord}
        defaultNationId={
          currentStep.level === 'NATION_HUB' ||
          currentStep.level === 'DOMESTIC_COMPS' ||
          currentStep.level === 'INDEPENDENT_CLUBS' ||
          currentStep.level === 'STADIUMS' ||
          currentStep.level === 'CITIES' ||
          currentStep.level === 'INDEPENDENT_AWARDS'
            ? currentStep.id
            : undefined
        }
        defaultCompId={
          currentStep.level === 'CLUBS_IN_COMP' || currentStep.level === 'COMP_AWARDS'
            ? currentStep.id
            : undefined
        }
      />

      <QuickSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectItem={(item, type) => {
          if (type === EntityType.NATION || type === 'nation') {
            pushStep({
              level: HierarchyLevel.NATION_HUB,
              id: item.id,
              title: `[${item.three_letter_name}] ${item.long_name}`,
            });
          } else if (type === EntityType.COMPETITION || type === 'competition') {
            pushStep({
              level: HierarchyLevel.CLUBS_IN_COMP,
              id: item.id,
              title: `${item.short_name || item.long_name}`,
            });
          } else {
            // Edit or view directly
            setEditingRecord(item);
            setRecordModalType(type as RecordTypeValue);
            setIsRecordModalOpen(true);
          }
        }}
      />
    </div>
  );
}
