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
export interface AnalyticsResponse {
    visitors: {
        totals: number;
        averageVisitorPerHour: AvgPerHour[]; visitorCheckedOutCount: number;
        visitorCheckedIn: number;
        avgVisitorperDay: number;
    };
    attendance: {
        totalPresentToday: number;
        checkedOutCount: number;
        currentlyInside: number;
        dailyAttendance: DailyAttendance[];
    };
}

/**
 * Fetch Analytics data from backend with optional start/end date filters
 */
export const getAnalytics = async (
    startDate?: string,
    endDate?: string
): Promise<AnalyticsResponse> => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const { data } = await api.get<AnalyticsResponse>("/analytics/admin", {
        params,
    });

    return data;
};
