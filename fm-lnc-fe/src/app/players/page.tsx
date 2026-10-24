'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Input, Table, Tag, Popconfirm, Tooltip, message, Space, type TableColumnsType } from 'antd';
import { SearchOutlined, PlusOutlined, UserOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchPlayers, deleteRecord, PlayerItem } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { RecordType } from '../../types';

export default function PlayersPage() {
  const { openRecordModal, refreshSignal, setHeaderTitle, setHeaderId } = useApp();

  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlayers();
      setPlayers(data);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to load persons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setHeaderTitle('Person');
    setHeaderId(undefined);
    loadPlayers();
  }, [loadPlayers, refreshSignal, setHeaderTitle, setHeaderId]);

  const filteredPlayers = useMemo(() => {
    if (!filterText.trim()) return players;
    const q = filterText.toLowerCase();
    return players.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.second_name.toLowerCase().includes(q) ||
        (p.common_name && p.common_name.toLowerCase().includes(q)) ||
        String(p.id).includes(q),
    );
  }, [players, filterText]);

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(RecordType.PLAYER, id);
      message.success('Person deleted');
      setPlayers((prev) => prev.filter((p) => String(p.id) !== String(id)));
    } catch (e: any) {
      message.error(e.message || 'Delete failed');
    }
  };

  const columns: TableColumnsType<PlayerItem> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 150,
        align: 'left',
        sorter: (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }),
        render: (id: string) => (
          <Tag color="blue" className="font-mono font-semibold m-0 text-xs">
            {id}
          </Tag>
        ),
      },
      {
        title: 'First Name',
        dataIndex: 'first_name',
        key: 'first_name',
        sorter: (a, b) => (a.first_name || '').localeCompare(b.first_name || ''),
        render: (text: string) => <span className="font-medium text-slate-800">{text || '-'}</span>,
      },
      {
        title: 'Second Name',
        dataIndex: 'second_name',
        key: 'second_name',
        sorter: (a, b) => (a.second_name || '').localeCompare(b.second_name || ''),
        render: (text: string) => <span className="font-semibold text-slate-900">{text || '-'}</span>,
      },
      {
        title: 'Common Name',
        dataIndex: 'common_name',
        key: 'common_name',
        sorter: (a, b) => (a.common_name || '').localeCompare(b.common_name || ''),
        render: (text: string) => <span className="text-slate-700">{text || '-'}</span>,
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 150,
        align: 'center',
        render: (_: any, record: PlayerItem) => (
          <Space size="small">
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined className="text-blue-600 hover:text-blue-700" />}
                onClick={() => openRecordModal(RecordType.PLAYER, record)}
              />
            </Tooltip>
            <Popconfirm
              title="Delete person"
              description="Are you sure you want to delete this record?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined className="text-red-500 hover:text-red-600" />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [openRecordModal],
  );

  return (
    <div>
      {/* Ribbon Header */}
      <div className="bg-[#e2f0fd] rounded-t-lg border border-[#cbe4fa] px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <UserOutlined className="text-blue-600 text-sm" />
          <span className="font-bold text-[#1e3a8a] text-xs sm:text-sm">Person</span>
          <Tag color="blue" className="m-0 font-bold text-xs">
            {filteredPlayers.length} records
          </Tag>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => openRecordModal(RecordType.PLAYER)}
            className="bg-blue-600 hover:bg-blue-700 font-medium"
            title="Add Person"
          >
            <span className="hidden sm:inline">Add Person</span>
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-[#cbe4fa] border-t-0 rounded-b-lg p-3 sm:p-5 shadow-sm min-h-[480px]">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4 pb-2 border-b border-gray-100">
          <div className="text-xs text-gray-500">
            Total: <strong className="text-gray-800">{filteredPlayers.length}</strong> persons
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Filter person by name, ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              allowClear
              className="flex-1 sm:w-72"
            />
          </div>
        </div>

        {/* Mobile Vertical Cards (md:hidden) - 1 card per row */}
        <div className="md:hidden grid grid-cols-1 gap-3">
          {filteredPlayers.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs italic">
              No person records found
            </div>
          ) : (
            filteredPlayers.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-lg p-2.5 sm:p-3.5 shadow-2xs flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <Tag color="blue" className="font-mono font-bold text-[10px] sm:text-xs m-0">
                    ID: {p.id}
                  </Tag>
                  <div className="flex items-center gap-1">
                    <Button
                      type="text"
                      shape="circle"
                      size="small"
                      icon={<EditOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
                      onClick={() => openRecordModal(RecordType.PLAYER, p)}
                    />
                    <Popconfirm
                      title="Delete Record"
                      description={`Delete ${p.first_name} ${p.second_name}?`}
                      onConfirm={() => handleDelete(String(p.id))}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        danger
                        icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                      />
                    </Popconfirm>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="w-8 text-gray-400 font-medium select-none shrink-0">FN:</span>
                    <span className="font-bold text-[13px] text-gray-800">{p.first_name || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="w-8 text-gray-400 font-medium select-none shrink-0">SN:</span>
                    <span className="font-bold text-[13px] text-gray-800">{p.second_name || '-'}</span>
                  </div>
                  {p.common_name && (
                    <div className="flex items-baseline gap-1.5">
                      <span className="w-8 text-gray-400 font-medium select-none shrink-0">CN:</span>
                      <span className="font-bold text-[13px] text-gray-700 italic">{p.common_name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Players Ant Design Table (hidden md:block) */}
        <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
          <Table<PlayerItem>
            rowKey="id"
            columns={columns}
            dataSource={filteredPlayers}
            loading={loading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `Showing ${range[0]} - ${range[1]} of ${total} records`,
              size: 'small',
            }}
            size="middle"
          />
        </div>
      </div>
    </div>
  );
}
