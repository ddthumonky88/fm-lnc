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
  App,
  Tooltip,
  type TableColumnsType,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  SafetyOutlined,
  StarOutlined,
  GlobalOutlined,
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
import CompetitionGroupView, {
  sortCompetitionsByCategory,
} from '../components/CompetitionGroupView';
import { formatCategoryCode, getCategoryTagColor } from '../components/EntityCard';
import CityGroupView from '../components/CityGroupView';
import {
  NationIcon,
  IntCompIcon,
  DomesticCompIcon,
  StadiumIcon,
  CityIcon,
  AwardIcon,
} from '../components/EntityIcons';
import { useApp } from '../context/AppContext';
import {
  HierarchyLevel,
  HierarchyLevelValue,
  NationTabKey,
  NationTabKeyValue,
  RecordType,
  RecordTypeValue,
  EntityType,
} from '../types';
import { matchRecordSearch } from '../utils/search';

interface NavStep {
  level: HierarchyLevelValue;
  id?: string;
  title: string;
  metadata?: any;
}

export default function LncSortitoutsiExplorer() {
  const router = useRouter();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } =
    useApp();

  const [navStack, setNavStack] = useState<NavStep[]>([
    { level: HierarchyLevel.CONTINENTS, title: 'FM' },
  ]);
  const [loading, setLoading] = useState(false);

  // Tab state for Nation view
  const [activeNationTab, setActiveNationTab] = useState<NationTabKeyValue>(
    NationTabKey.DOMESTIC_COMPS,
  );
  const [nationTabLoading, setNationTabLoading] = useState(false);

  // Server pagination and search states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  // Search modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Data states
  const [continents, setContinents] = useState<ConfederationItem[]>([]);
  const [nations, setNations] = useState<NationItem[]>([]);
  const [intComps, setIntComps] = useState<CompetitionItem[]>([]);
  const [nationHub, setNationHub] = useState<NationHubData | null>(null);
  const [detailRecords, setDetailRecords] = useState<any[]>([]);
  const [compInfo, setCompInfo] = useState<
    (CompetitionItem & { clubsCount: number; awardsCount: number }) | null
  >(null);

  // CRUD modal state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordModalType, setRecordModalType] = useState<RecordTypeValue>(RecordType.CLUB);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);

  const currentStep = navStack[navStack.length - 1];

  const pushStep = useCallback((step: NavStep) => {
    setSearchInput('');
    setSearchKeyword('');
    setCurrentPage(1);
    setNavStack((prev) => [...prev, step]);
  }, []);

  const jumpTo = (index: number) => {
    setSearchInput('');
    setSearchKeyword('');
    setCurrentPage(1);
    setNavStack(navStack.slice(0, index + 1));
  };

  // Load records for active Nation tab
  const loadNationDataForTab = useCallback(
    async (nationId: string, tabKey: NationTabKeyValue, page = 1, keyword = '', size = 20) => {
      setNationTabLoading(true);
      try {
        const query = { page: page - 1, size, keyword };
        let data: any[] = [];
        if (tabKey === NationTabKey.DOMESTIC_COMPS) {
          data = await fetchDomesticCompetitions(nationId, query);
        } else if (tabKey === NationTabKey.STADIUMS) {
          data = await fetchStadiums(nationId, query);
        } else if (tabKey === NationTabKey.CITIES) {
          data = await fetchCities(nationId, query);
        } else if (tabKey === NationTabKey.AWARDS) {
          data = await fetchAwards(nationId, query);
        }
        setDetailRecords(data);
        const total = (data as any)?.totalElements ?? (data as any)?.total ?? data.length;
        setTotalRecords(total);
        setNationHub((prev) => {
          if (!prev) return prev;
          const keyMap: Record<string, keyof typeof prev.counts> = {
            [NationTabKey.DOMESTIC_COMPS]: 'domesticComps',
            [NationTabKey.STADIUMS]: 'stadiums',
            [NationTabKey.CITIES]: 'cities',
            [NationTabKey.AWARDS]: 'awards',
          };
          const countKey = keyMap[tabKey];
          if (countKey && !keyword) {
            return {
              ...prev,
              counts: {
                ...prev.counts,
                [countKey]: total,
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
    [message],
  );

  // Switch Nation tab
  const handleSwitchNationTab = async (tabKey: NationTabKeyValue) => {
    setActiveNationTab(tabKey);
    setSearchInput('');
    setSearchKeyword('');
    setCurrentPage(1);
    setDetailRecords([]);
    if (currentStep.id !== undefined) {
      await loadNationDataForTab(String(currentStep.id), tabKey, 1, '', pageSize);
    }
  };

  // Switch Competition tab (Clubs vs Awards)
  const handleSwitchCompTab = (targetLevel: 'CLUBS_IN_COMP' | 'COMP_AWARDS') => {
    if (currentStep.level === targetLevel) return;
    setTableFilter('');
    setCurrentPage(1);
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
  const loadCurrentLevelData = useCallback(
    async (page = 1, keyword = '', size = 20) => {
      setLoading(true);
      try {
        const query = { page: page - 1, size, keyword };
        if (currentStep.level === 'CONTINENTS') {
          const data = await fetchContinents(query);
          const list = Array.isArray(data) ? data : (data as any)?.content || [];
          setContinents(list);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? list.length);
        } else if (currentStep.level === 'NATIONS' && currentStep.id !== undefined) {
          const data = await fetchNationsByContinent(String(currentStep.id), query);
          setNations(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        } else if (currentStep.level === 'INT_COMPETITIONS' && currentStep.id !== undefined) {
          const data = await fetchIntCompetitions(String(currentStep.id), query);
          setIntComps(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
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
            await loadNationDataForTab(String(currentStep.id), targetTab, page, keyword, size);
          } else {
            setDetailRecords([]);
            setTotalRecords(0);
          }
        } else if (currentStep.level === 'DOMESTIC_COMPS' && currentStep.id !== undefined) {
          const data = await fetchDomesticCompetitions(String(currentStep.id), query);
          setDetailRecords(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        } else if (currentStep.level === 'INDEPENDENT_CLUBS' && currentStep.id !== undefined) {
          const isExtinct = currentStep.metadata?.is_extinct;
          const data = await fetchIndependentClubs(String(currentStep.id), {
            extinct: isExtinct,
            ...query,
          });
          setDetailRecords(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        } else if (currentStep.level === 'CLUBS_IN_COMP' && currentStep.id !== undefined) {
          const [info, data] = await Promise.all([
            fetchCompetitionInfo(String(currentStep.id)).catch(() => null),
            fetchClubsInComp(String(currentStep.id), query),
          ]);
          if (info) setCompInfo(info);
          setDetailRecords(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        } else if (currentStep.level === 'STADIUMS' && currentStep.id !== undefined) {
          const data = await fetchStadiums(String(currentStep.id), query);
          setDetailRecords(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        } else if (currentStep.level === 'CITIES' && currentStep.id !== undefined) {
          const data = await fetchCities(String(currentStep.id), query);
          setDetailRecords(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        } else if (currentStep.level === 'INDEPENDENT_AWARDS' && currentStep.id !== undefined) {
          const data = await fetchAwards(String(currentStep.id), query);
          setDetailRecords(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        } else if (currentStep.level === 'COMP_AWARDS' && currentStep.id !== undefined) {
          const [info, data] = await Promise.all([
            fetchCompetitionInfo(String(currentStep.id)).catch(() => null),
            fetchAwardsInComp(String(currentStep.id), query),
          ]);
          if (info) setCompInfo(info);
          setDetailRecords(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        } else if (currentStep.level === 'GLOBAL_PLAYERS') {
          const data = await fetchPlayers(query);
          setDetailRecords(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        } else if (currentStep.level === 'GLOBAL_STAGES') {
          const data = await fetchStages(query);
          setDetailRecords(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        } else if (currentStep.level === 'GLOBAL_AWARDS') {
          const data = await fetchAllAwards(query);
          setDetailRecords(data);
          setTotalRecords((data as any)?.totalElements ?? (data as any)?.total ?? data.length);
        }
      } catch (e: any) {
        console.error(e);
        message.error(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    },
    [currentStep, activeNationTab, loadNationDataForTab, message],
  );

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
    return continents
      .filter((c) => matchRecordSearch(c, tableFilter))
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
        render: (name: string, record: ConfederationItem) => {
          const confedLogo = getConfederationLogoUrl(record.id);
          return (
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                {confedLogo ? (
                  <img
                    src={confedLogo}
                    alt={name}
                    className="w-8 h-8 object-contain rounded bg-white p-0.5 border border-slate-200 shadow-2xs"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  style={{ display: confedLogo ? 'none' : 'flex' }}
                  className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 items-center justify-center text-xs font-bold text-blue-700 shrink-0"
                >
                  {name ? name[0] : 'C'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/confed/${record.id}`)}
                className="font-bold text-sm text-[#1d70b8] hover:underline text-left hover:text-blue-700 transition cursor-pointer"
              >
                {name}
              </button>
            </div>
          );
        },
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
                  onClick={() => router.push(`/confed/${record.id}`)}
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
                  onClick={() => router.push(`/confed/${record.id}?tab=int`)}
                  className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md hover:bg-purple-50 text-purple-700 font-medium border border-purple-100"
                >
                  <IntCompIcon size={14} className="text-purple-600" />
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
    return nations;
  }, [nations]);

  const filteredIntComps = useMemo(() => {
    return [...intComps].sort(sortCompetitionsByCategory);
  }, [intComps]);

  const filteredDetailRecords = useMemo(() => {
    return detailRecords;
  }, [detailRecords]);

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    const effSize = newPageSize && newPageSize !== pageSize ? newPageSize : pageSize;
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
    setCurrentPage(newPage);
    if (currentStep.level === HierarchyLevel.NATION_HUB && currentStep.id !== undefined) {
      loadNationDataForTab(
        String(currentStep.id),
        activeNationTab,
        newPage,
        searchKeyword,
        effSize,
      );
    } else {
      loadCurrentLevelData(newPage, searchKeyword, effSize);
    }
  };

  const handleSearchSubmit = () => {
    const kw = searchInput.trim();
    setSearchKeyword(kw);
    setCurrentPage(1);
    if (currentStep.level === HierarchyLevel.NATION_HUB && currentStep.id !== undefined) {
      loadNationDataForTab(String(currentStep.id), activeNationTab, 1, kw, pageSize);
    } else {
      loadCurrentLevelData(1, kw, pageSize);
    }
  };

  const serverPagination = {
    current: currentPage,
    pageSize,
    total: totalRecords,
    onChange: handlePageChange,
  };

  // Configuration of tabs for Nation Hub (100% English, no Vietnamese subtitles)
  const nationTabsConfig = useMemo(() => {
    return [
      {
        key: NationTabKey.DOMESTIC_COMPS,
        label: 'Competitions',
        count: nationHub?.counts?.domesticComps || 0,
        icon: <DomesticCompIcon size={18} className="text-amber-500" />,
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
        icon: <CityIcon size={18} className="text-sky-500" />,
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
        url: getNationLogoUrl(currentStep.id, currentStep.metadata?.name_3l),
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
  }, [
    currentStep,
    navStack,
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
  ]);

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
                  onClick={() => router.push(`/confed/${c.id}`)}
                  className="bg-white border border-gray-200 hover:border-blue-400 active:bg-slate-50 rounded-lg p-2 sm:p-3 shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-1.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <Tag
                        color="blue"
                        className="font-mono font-bold text-[10px] m-0 shrink-0 px-1 py-0"
                      >
                        {c.id}
                      </Tag>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getConfederationLogoUrl(c.id) ? (
                        <img
                          src={getConfederationLogoUrl(c.id)}
                          alt={c.name}
                          className="w-6 h-6 object-contain rounded bg-white shadow-2xs border border-slate-200 shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className="font-bold text-xs text-slate-800 line-clamp-1" title={c.name}>
                        {c.name}
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 text-[11px] space-y-0.5 text-slate-600">
                    <div className="flex items-center gap-1 truncate">
                      <NationIcon size={12} className="text-cyan-600 shrink-0" />
                      <span className="truncate">
                        <strong>{c.totalNations || 0}</strong> nations
                      </span>
                    </div>
                    <div className="flex items-center gap-1 truncate">
                      <IntCompIcon size={12} className="text-purple-600 shrink-0" />
                      <span className="truncate">
                        <strong>{c.totalIntComps || 0}</strong> comps
                      </span>
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
              const confedsList = Array.isArray(continents)
                ? continents
                : (continents as any)?.content || [];
              const currentConfed = confedsList.find((c: any) => c.id === currentStep.id);
              if (!currentConfed || (currentConfed.totalNations || 0) === 0) return null;
              return (
                <Tabs
                  activeKey="INT_COMPETITIONS"
                  onChange={(key) => {
                    setTableFilter('');
                    setCurrentPage(1);
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
                          <NationIcon size={16} className="text-cyan-600" />
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
                          <IntCompIcon size={16} className="text-purple-600" />
                          <span className="hidden sm:inline font-semibold">
                            International Competitions
                          </span>
                          <Badge
                            count={currentConfed.totalIntComps}
                            overflowCount={99999}
                            style={{ backgroundColor: '#9333ea' }}
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
              const confedsList = Array.isArray(continents)
                ? continents
                : (continents as any)?.content || [];
              const currentConfed = confedsList.find((c: any) => c.id === currentStep.id);
              if (!currentConfed || (currentConfed.totalIntComps || 0) === 0) return null;
              return (
                <Tabs
                  activeKey="NATIONS"
                  onChange={(key) => {
                    setTableFilter('');
                    setCurrentPage(1);
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
                          <NationIcon size={16} className="text-cyan-600" />
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
                          <IntCompIcon size={16} className="text-purple-600" />
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
              <Space.Compact className="w-full sm:w-64">
                <Input
                  placeholder="Search countries..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
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
              items={filteredNations}
              type={EntityType.NATION}
              cardSize="small"
              loading={loading}
              serverPagination={serverPagination}
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
                  {getNationLogoUrl(nationHub.nation?.id, nationHub.nation?.name_3l) ? (
                    <img
                      src={getNationLogoUrl(
                        nationHub.nation?.id,
                        nationHub.nation?.name_3l,
                      )}
                      alt={currentStep.title}
                      className="w-8 h-5.5 object-cover rounded shadow-2xs border border-slate-300 shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span>{currentStep.title}</span>
                  <Tag color="cyan" className="font-bold m-0">
                    {nationHub.nation?.id}
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
                        <span className="hidden sm:inline font-semibold text-xs sm:text-sm">
                          {tab.label}
                        </span>
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
                  {activeNationTab !== NationTabKey.DOMESTIC_COMPS &&
                    activeNationTab !== NationTabKey.CITIES && (
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4">
                        <div className="text-xs text-gray-500">
                          Category:{' '}
                          <strong className="text-gray-800">{currentNationTabObj?.label}</strong> (
                          {filteredDetailRecords.length} records)
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
                            <span className="hidden sm:inline">
                              {currentNationTabObj?.addLabel || 'Add Record'}
                            </span>
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
                      serverPagination={serverPagination}
                      extraRight={
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                          <Space.Compact className="w-48 sm:w-64">
                            <Input
                              placeholder="Search competitions..."
                              value={searchInput}
                              onChange={(e) => setSearchInput(e.target.value)}
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
                            className="shrink-0"
                            onClick={() => {
                              setEditingRecord(null);
                              setRecordModalType(currentRecordType);
                              setIsRecordModalOpen(true);
                            }}
                            title={currentNationTabObj?.addLabel || 'Add Competition'}
                          >
                            <span className="hidden sm:inline">
                              {currentNationTabObj?.addLabel || 'Add Competition'}
                            </span>
                          </Button>
                        </div>
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
                      serverPagination={serverPagination}
                      extraRight={
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                          <Space.Compact className="w-48 sm:w-64">
                            <Input
                              placeholder="Search cities..."
                              value={searchInput}
                              onChange={(e) => setSearchInput(e.target.value)}
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
                            className="shrink-0"
                            onClick={() => {
                              setEditingRecord(null);
                              setRecordModalType(currentRecordType);
                              setIsRecordModalOpen(true);
                            }}
                            title={currentNationTabObj?.addLabel || 'Add City'}
                          >
                            <span className="hidden sm:inline">
                              {currentNationTabObj?.addLabel || 'Add City'}
                            </span>
                          </Button>
                        </div>
                      }
                    />
                  ) : (
                    <CardGrid
                      items={filteredDetailRecords}
                      type={currentRecordType}
                      loading={nationTabLoading}
                      serverPagination={serverPagination}
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
              {currentStep.level === 'CLUBS_IN_COMP' || currentStep.level === 'COMP_AWARDS' ? (
                <div className="bg-white rounded-lg border border-slate-200 p-3.5 sm:p-4 mb-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      {compInfo?.nation &&
                      getNationLogoUrl(compInfo.nation.id, compInfo.nation.name_3l) ? (
                        <img
                          src={getNationLogoUrl(
                            compInfo.nation.id,
                            compInfo.nation.name_3l,
                          )}
                          alt={compInfo.nation.name_sh || compInfo.nation.name_lg || compInfo.nation.name}
                          className="w-8 h-6 object-cover rounded-xs border border-slate-200 shadow-2xs shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (compInfo?.confed?.id || compInfo?.confed_id) &&
                        getConfederationLogoUrl(
                          compInfo.confed?.id || compInfo.confed_id!,
                        ) ? (
                        <img
                          src={getConfederationLogoUrl(
                            compInfo.confed?.id || compInfo.confed_id!,
                          )}
                          alt={compInfo.confed?.name || 'Confederation'}
                          className="w-8 h-8 object-contain shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : !compInfo?.nation_id || compInfo?.is_international ? (
                        <IntCompIcon size={24} className="text-purple-600 shrink-0" />
                      ) : (
                        <DomesticCompIcon size={24} className="text-amber-500 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-bold text-slate-800 m-0">
                            {compInfo?.name_sh ||
                              compInfo?.name_lg ||
                              compInfo?.name ||
                              currentStep.title.replace(/ - (Clubs|Awards)$/, '')}
                          </h2>
                          {currentStep.id && (
                            <Tag color="cyan" className="m-0 font-bold text-xs">
                              {currentStep.id}
                            </Tag>
                          )}
                          {compInfo?.categories && (
                            <Tooltip
                              title={compInfo.categories}
                              trigger="hover"
                              destroyTooltipOnHide
                            >
                              <Tag
                                color={getCategoryTagColor(compInfo.categories)}
                                className="m-0 text-xs font-semibold font-mono cursor-default"
                              >
                                {formatCategoryCode(compInfo.categories)}
                              </Tag>
                            </Tooltip>
                          )}
                        </div>
                        {compInfo?.name_lg && compInfo.name_lg !== compInfo.name_sh && (
                          <div className="text-xs text-slate-500 mt-0.5">{compInfo.name_lg}</div>
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
                          count={
                            compInfo?.stats?.club ??
                            compInfo?.clubsCount ??
                            (currentStep.level === 'CLUBS_IN_COMP' ? detailRecords.length : 0)
                          }
                          overflowCount={9999}
                          style={{
                            backgroundColor:
                              currentStep.level === 'CLUBS_IN_COMP' ? '#1d4ed8' : '#64748b',
                            color: '#fff',
                          }}
                        />
                      </button>

                      {(((compInfo?.stats?.award ?? compInfo?.awardsCount) || 0) > 0 ||
                        currentStep.level === 'COMP_AWARDS') && (
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
                            count={
                              compInfo?.stats?.award ??
                              compInfo?.awardsCount ??
                              (currentStep.level === 'COMP_AWARDS' ? detailRecords.length : 0)
                            }
                            overflowCount={9999}
                            style={{
                              backgroundColor:
                                currentStep.level === 'COMP_AWARDS' ? '#d97706' : '#64748b',
                              color: '#fff',
                            }}
                          />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder={
                          currentStep.level === 'COMP_AWARDS'
                            ? 'Filter awards...'
                            : 'Filter clubs...'
                        }
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
                  serverPagination={serverPagination}
                  extraRight={
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                      <Space.Compact className="w-48 sm:w-64">
                        <Input
                          placeholder="Search competitions..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
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
                    </div>
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
                  serverPagination={serverPagination}
                  extraRight={
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                      <Space.Compact className="w-48 sm:w-64">
                        <Input
                          placeholder="Search cities..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
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
                    </div>
                  }
                />
              ) : (
                <CardGrid
                  items={filteredDetailRecords}
                  type={currentRecordType}
                  loading={loading}
                  serverPagination={serverPagination}
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
              title: `[${item.name_3l}] ${item.name_lg || item.name}`,
            });
          } else if (type === EntityType.COMPETITION || type === 'competition') {
            pushStep({
              level: HierarchyLevel.CLUBS_IN_COMP,
              id: item.id,
              title: `${item.name_sh || item.name_lg || item.name}`,
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
