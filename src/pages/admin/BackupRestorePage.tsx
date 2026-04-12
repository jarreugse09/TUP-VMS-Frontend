import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Input, Table, Typography, Upload, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DatabaseOutlined, UploadOutlined } from "@ant-design/icons";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import api from "../../services/api";

const { Title, Paragraph, Text } = Typography;

interface BackupLog {
  _id: string;
  backupType: "manual" | "scheduled";
  fileName: string;
  sizeBytes?: number;
  status: "success" | "failed";
  createdAt: string;
}

const formatManilaDate = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));

const formatBytes = (bytes?: number) => {
  if (!bytes) return "Unknown";

  const units = ["Bytes", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null
  ) {
    const data = error.response.data as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  }

  return fallback;
};

const BackupRestorePage: React.FC = () => {
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmToken, setConfirmToken] = useState("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const columns = useMemo<ColumnsType<BackupLog>>(
    () => [
      {
        title: "Date",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (value: string) => formatManilaDate(value),
      },
      {
        title: "Type",
        dataIndex: "backupType",
        key: "backupType",
        render: (value: BackupLog["backupType"]) =>
          value === "manual" ? "Manual" : "Scheduled",
      },
      {
        title: "File Name",
        dataIndex: "fileName",
        key: "fileName",
      },
      {
        title: "Size",
        dataIndex: "sizeBytes",
        key: "sizeBytes",
        render: (value?: number) => formatBytes(value),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (value: BackupLog["status"]) =>
          value === "success" ? "Success" : "Failed",
      },
    ],
    [],
  );

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: BackupLog[] }>("/backup/logs");
      setLogs(response.data.data ?? []);
    } catch (error: unknown) {
      const nextMessage = getErrorMessage(error, "Failed to load backup logs.");
      setErrorBanner(nextMessage);
      message.error(nextMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
  }, []);

  const handleCreateBackup = async () => {
    setDownloadLoading(true);
    setSuccessBanner(null);
    setErrorBanner(null);

    try {
      const response = await api.post<Blob>("/backup/download", undefined, {
        responseType: "blob",
      });

      const contentDisposition = response.headers["content-disposition"];
      const matchedFileName = contentDisposition?.match(/filename="([^"]+)"/)?.[1];
      const fallbackTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = matchedFileName ?? `vms-backup-${fallbackTimestamp}.json.gz`;

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/gzip" }),
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setSuccessBanner("Backup created and downloaded successfully.");
      message.success("Backup created and downloaded successfully.");
      await fetchLogs();
    } catch (error: unknown) {
      const nextMessage = getErrorMessage(error, "Failed to create backup.");
      setErrorBanner(nextMessage);
      message.error(nextMessage);
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile || !confirmToken.trim()) {
      return;
    }

    setRestoreLoading(true);
    setSuccessBanner(null);
    setErrorBanner(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("confirmToken", confirmToken.trim());

      await api.post("/backup/restore", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccessBanner("Restore complete. Re-login recommended.");
      message.success("Restore complete. Re-login recommended.");
      setSelectedFile(null);
      setConfirmToken("");
      await fetchLogs();
    } catch (error: unknown) {
      const nextMessage = getErrorMessage(error, "Failed to restore database.");
      setErrorBanner(nextMessage);
      message.error(nextMessage);
    } finally {
      setRestoreLoading(false);
    }
  };

  const uploadProps = {
    accept: ".json.gz",
    beforeUpload: (file: RcFile) => {
      const isBackupFile = file.name.endsWith(".json.gz");
      if (!isBackupFile) {
        message.error("Only .json.gz backup files are allowed.");
        return Upload.LIST_IGNORE;
      }

      setSelectedFile(file);
      setErrorBanner(null);
      return false;
    },
    fileList: selectedFile
      ? [
          {
            uid: selectedFile.name,
            name: selectedFile.name,
            status: "done",
          } satisfies UploadFile,
        ]
      : [],
    onRemove: () => {
      setSelectedFile(null);
    },
    maxCount: 1,
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <DatabaseOutlined className="text-2xl text-blue-600" />
          <div>
            <Title level={3} className="!mb-4 !text-xl sm:!text-2xl !font-bold !text-gray-800">
              Backup & Restore
            </Title>
            <Text type="secondary">
              Create compressed database backups and restore from approved backup files.
            </Text>
          </div>
        </div>

        {successBanner ? (
          <Alert
            type="success"
            showIcon
            message={successBanner}
            closable
            onClose={() => setSuccessBanner(null)}
          />
        ) : null}

        {errorBanner ? (
          <Alert
            type="error"
            showIcon
            message={errorBanner}
            closable
            onClose={() => setErrorBanner(null)}
          />
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Title level={4} className="!mb-4 !text-xl sm:!text-2xl !font-bold !text-gray-800">
            Create &amp; Download Backup
          </Title>
          <Paragraph type="secondary">
            This generates a fresh gzip backup from the current database and downloads it immediately.
          </Paragraph>
          <Button
            className="w-full sm:w-auto"
            type="primary"
            icon={<DatabaseOutlined />}
            loading={downloadLoading}
            onClick={() => void handleCreateBackup()}
          >
            Create & Download Backup
          </Button>
        </section>

        <section className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message="Danger Zone"
            description="Restoring a backup overwrites live database contents. Proceed only with the correct .json.gz file and the server restore confirmation token."
          />
          <Title level={4} className="!mb-4 !text-xl sm:!text-2xl !font-bold !text-gray-800">
            Restore Database
          </Title>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Text className="mb-2 block">Backup File</Text>
              <Upload {...uploadProps}>
                <Button className="w-full sm:w-auto" icon={<UploadOutlined />}>
                  Select .json.gz Backup
                </Button>
              </Upload>
            </div>
            <div>
              <Text className="mb-2 block">Restore Confirmation Token</Text>
              <Input
                className="w-full sm:w-auto"
                value={confirmToken}
                placeholder="Enter RESTORE_CONFIRM_TOKEN from server config"
                onChange={(event) => setConfirmToken(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              className="w-full sm:w-auto"
              danger
              type="primary"
              loading={restoreLoading}
              disabled={!selectedFile || !confirmToken.trim()}
              onClick={() => void handleRestore()}
            >
              Restore Database
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <Title level={4} className="!mb-4 !text-xl sm:!text-2xl !font-bold !text-gray-800">
                Backup Log History
              </Title>
              <Text type="secondary">Latest 20 backup operations for the current user.</Text>
            </div>
            <Button className="w-full sm:w-auto" onClick={() => void fetchLogs()} loading={loading}>
              Refresh
            </Button>
          </div>
          <div className="overflow-x-auto w-full">
            <Table
              columns={columns}
              dataSource={logs}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 720 }}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default BackupRestorePage;
