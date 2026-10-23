'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Input, Table, Tag, Popconfirm, Tooltip, message, Space, type TableColumnsType } from 'antd';
import { SearchOutlined, PlusOutlined, FlagOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchStages, deleteRecord, StageItem } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { RecordType } from '../../types';

export default function StagesPage() {
  const { openRecordModal, refreshSignal, setHeaderTitle, setHeaderId } = useApp();

  const [stages, setStages] = useState<StageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');

  const loadStages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStages();
      setStages(data);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to load tournament stages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setHeaderTitle('Tournament Stages');
    setHeaderId(undefined);
    loadStages();
  }, [loadStages, refreshSignal, setHeaderTitle, setHeaderId]);

  const filteredStages = useMemo(() => {
    if (!filterText.trim()) return stages;
    const q = filterText.toLowerCase();
    return stages.filter(
      (s) => s.name.toLowerCase().includes(q) || String(s.id).includes(q),
    );
  }, [stages, filterText]);

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(RecordType.STAGE, id);
      message.success('Stage deleted');
      setStages((prev) => prev.filter((s) => String(s.id) !== String(id)));
    } catch (e: any) {
      message.error(e.message || 'Delete failed');
    }
  };

  const columns: TableColumnsType<StageItem> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 150,
        align: 'left',
        sorter: (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }),
        render: (id: string) => (
          <Tag color="magenta" className="font-mono font-semibold m-0 text-xs">
            {id}
          </Tag>
        ),
      },
      {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (name: string) => (
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-xs text-rose-600 shrink-0">
              <FlagOutlined />
            </span>
            <span className="font-semibold text-slate-800 text-sm">{name}</span>
          </div>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 150,
        align: 'center',
        render: (_: any, record: StageItem) => (
          <Space size="small">
            <Tooltip title="Edit Stage">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined className="text-blue-600 hover:text-blue-700" />}
                onClick={() => openRecordModal(RecordType.STAGE, record)}
              />
            </Tooltip>
            <Popconfirm
              title="Delete Stage"
              description="Are you sure you want to delete this tournament stage?"
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
          <FlagOutlined className="text-rose-600 text-sm" />
          <span className="font-bold text-[#1e3a8a] text-xs sm:text-sm">Tournament Stages</span>
          <Tag color="magenta" className="m-0 font-bold text-xs">
            {filteredStages.length} records
          </Tag>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => openRecordModal(RecordType.STAGE)}
            className="bg-blue-600 hover:bg-blue-700 font-medium"
          >
            Add Stage
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-[#cbe4fa] border-t-0 rounded-b-lg p-3 sm:p-5 shadow-sm min-h-[480px]">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4 pb-2 border-b border-gray-100">
          <div className="text-xs text-gray-500">
            Total: <strong className="text-gray-800">{filteredStages.length}</strong> tournament stages
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Filter stages by name, ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              allowClear
              className="flex-1 sm:w-72"
            />
          </div>
        </div>

        {/* Mobile Vertical Cards (md:hidden) */}
        <div className="md:hidden space-y-3">
          {filteredStages.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs italic">
              No tournament stages found
            </div>
          ) : (
            filteredStages.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-2xs flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <Tag color="magenta" className="font-mono font-bold text-xs m-0">
                    ID: {s.id}
                  </Tag>
                  <div className="flex items-center gap-1">
                    <Button
                      type="text"
                      shape="circle"
                      size="small"
                      icon={<EditOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
                      onClick={() => openRecordModal(RecordType.STAGE, s)}
                    />
                    <Popconfirm
                      title="Delete Record"
                      description={`Delete stage "${s.name}"?`}
                      onConfirm={() => handleDelete(String(s.id))}
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

                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-xs text-rose-600 shrink-0">
                    <FlagOutlined />
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">{s.name}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stages Ant Design Table (hidden md:block) */}
        <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
          <Table<StageItem>
            rowKey="id"
            columns={columns}
            dataSource={filteredStages}
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
