import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, Spin, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

type UploadKind = 'attendance' | 'transaction' | 'visit-log';

interface UploadErrorRow {
  row: number;
  message: string;
}

interface UploadResult {
  recordsInserted: number;
  recordsFailed: number;
  errors: UploadErrorRow[];
}

interface UploadSectionConfig {
  key: UploadKind;
  title: string;
  description: string;
}

type UploadSectionState = {
  file: File | null;
  loading: boolean;
  error: string | null;
  result: UploadResult | null;
};

const sectionConfigs: UploadSectionConfig[] = [
  {
    key: 'attendance',
    title: 'Attendance Upload',
    description: 'Upload attendance CSV records using the official attendance template.',
  },
  {
    key: 'transaction',
    title: 'Transaction Upload',
    description: 'Upload client and provider transaction logs using the transaction template.',
  },
  {
    key: 'visit-log',
    title: 'Visit Log Upload',
    description: 'Upload visit log entries using the official visit log template.',
  },
];

const createInitialSectionState = (): Record<UploadKind, UploadSectionState> => ({
  attendance: { file: null, loading: false, error: null, result: null },
  transaction: { file: null, loading: false, error: null, result: null },
  'visit-log': { file: null, loading: false, error: null, result: null },
});

const CsvUploadPage: React.FC = () => {
  const { token } = useAuth();
  const [sections, setSections] = useState<Record<UploadKind, UploadSectionState>>(
    createInitialSectionState(),
  );

  const errorColumns = useMemo<ColumnsType<UploadErrorRow>>(
    () => [
      {
        title: 'Row',
        dataIndex: 'row',
        key: 'row',
        width: 120,
      },
      {
        title: 'Error Message',
        dataIndex: 'message',
        key: 'message',
      },
    ],
    [],
  );

  const updateSection = (
    section: UploadKind,
    nextState: Partial<UploadSectionState>,
  ) => {
    setSections((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...nextState,
      },
    }));
  };

  const handleTemplateDownload = async (section: UploadKind) => {
    try {
      const response = await axios.get(`/api/csv-upload/template/${section}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: 'text/csv' }),
      );
      const link = document.createElement('a');
      const filename = `${section}-template.csv`;
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      message.error('Failed to download template');
    }
  };

  const handleFileSelect = (section: UploadKind, file: File | null) => {
    updateSection(section, {
      file,
      error: null,
      result: null,
    });
  };

  const handleUpload = async (section: UploadKind) => {
    const selectedFile = sections[section].file;
    if (!selectedFile) {
      return;
    }

    updateSection(section, { loading: true, error: null, result: null });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post<UploadResult>(
        `/api/csv-upload/${section}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      updateSection(section, {
        loading: false,
        result: response.data,
      });
      message.success(`${selectedFile.name} uploaded successfully`);
    } catch (error: unknown) {
      const nextError = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? 'CSV upload failed'
        : 'CSV upload failed';

      updateSection(section, {
        loading: false,
        error: nextError,
      });
      message.error(nextError);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Title level={3} className="!text-xl sm:!text-2xl !font-bold !text-gray-800 !mb-4">
            CSV Data Import
          </Title>
          <Paragraph type="secondary">
            Upload official CSV templates for attendance, transaction logs, and visit logs.
          </Paragraph>
        </div>

        {sectionConfigs.map((section) => {
          const sectionState = sections[section.key];

          return (
            <Card key={section.key} className="rounded-xl border border-slate-200 shadow-sm">
              <div className="space-y-4">
                <div>
                  <Title level={4} className="!text-xl sm:!text-2xl !font-bold !text-gray-800 !mb-4">
                    {section.title}
                  </Title>
                  <Text type="secondary">{section.description}</Text>
                </div>

                {sectionState.error ? (
                  <Alert type="error" showIcon message={sectionState.error} />
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Text className="mb-2 block font-medium text-slate-700">
                      Download Template
                    </Text>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => void handleTemplateDownload(section.key)}
                    >
                      Download Template
                    </Button>
                  </div>

                  <div>
                    <Text className="mb-2 block font-medium text-slate-700">
                      Select CSV File
                    </Text>
                    <input
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      type="file"
                      accept=".csv"
                      onChange={(event) =>
                        handleFileSelect(section.key, event.target.files?.[0] ?? null)
                      }
                    />
                    <Text type="secondary" className="mt-2 block">
                      {sectionState.file ? sectionState.file.name : 'No file selected'}
                    </Text>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    className="w-full sm:w-auto"
                    type="primary"
                    disabled={!sectionState.file || sectionState.loading}
                    onClick={() => void handleUpload(section.key)}
                  >
                    Upload
                  </Button>
                  {sectionState.loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Spin size="small" />
                      <span>Uploading...</span>
                    </div>
                  ) : null}
                </div>

                {sectionState.result ? (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <Text type="secondary">Records Inserted</Text>
                        <div className="text-2xl font-bold text-slate-900">
                          {sectionState.result.recordsInserted}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <Text type="secondary">Records Failed</Text>
                        <div className="text-2xl font-bold text-slate-900">
                          {sectionState.result.recordsFailed}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Title level={5} className="!mb-4 !text-lg !font-semibold !text-gray-800">
                        Error Table
                      </Title>
                      <div className="overflow-x-auto w-full">
                        <Table
                          columns={errorColumns}
                          dataSource={sectionState.result.errors}
                          rowKey={(record) => `${record.row}-${record.message}`}
                          pagination={false}
                          locale={{ emptyText: 'No errors' }}
                          scroll={{ x: 500 }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CsvUploadPage;
