import api from "@/services/api";

export interface PurposeCount {
  _id: string;
  count: number;
}

export interface PerDayCount {
  _id: string; // yyyy-mm-dd
  count: number;
}

export interface Heatmap {
  _id: { day: number; hour: number };
  count: number;
}

export interface DailyAttendance {
  _id: string; // yyyy-mm-dd
  present: number;
  checkedOut: number;
}

export interface AvgPerHour {
  _id: number;
  hour: number;
  avgCount: number;
}

export interface RoleDailyCount {
  _id: string; // yyyy-mm-dd
  count: number;
}

export interface RoleSummary {
  totalUsers: number;
  usersCurrentlyInside: number;
  usersCheckedOut: number;
  dailyCounts: RoleDailyCount[];
}

export interface AnalyticsResponse {
  roles: Record<"Student" | "Staff" | "Visitor" | "TUP", RoleSummary>;
  combinedDaily: Array<{
    _id: string;
    Student: number;
    Staff: number;
    Visitor: number;
    TUP: number;
  }>;
  dateRange: string[];
}

export interface HourlyAnalyticsResponse {
  hourly: Array<{
    hour: number;
    Student: number;
    Staff: number;
    Visitor: number;
    TUP: number;
  }>;
}

/**
 * Fetch Analytics data from backend with optional start/end date filters
 */
export const getAnalytics = async (
  startDate?: string,
  endDate?: string,
): Promise<AnalyticsResponse> => {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const { data } = await api.get<AnalyticsResponse>("/analytics/admin", {
    params,
  });

  return data;
};

/**
 * Fetch hourly analytics for a specific date
 */
export const getHourlyAnalytics = async (
  date: string,
): Promise<HourlyAnalyticsResponse> => {
  const { data } = await api.get<HourlyAnalyticsResponse>("/analytics/hourly", {
    params: { date },
  });

  return data;
};
