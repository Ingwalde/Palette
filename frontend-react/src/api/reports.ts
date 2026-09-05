import { request } from "../lib/http";
import type { Report, ReportReason } from "../types/api";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export function reportPalette(
  paletteId: number,
  reason: ReportReason,
  detail = "",
): Promise<Report> {
  return request<Report>(`/palettes/${paletteId}/report`, {
    method: "POST",
    ...json({ reason, detail }),
  });
}

export function listReports(): Promise<Report[]> {
  return request<Report[]>("/reports");
}

export function actionReport(reportId: number): Promise<Report> {
  return request<Report>(`/reports/${reportId}/action`, { method: "POST" });
}

export function dismissReport(reportId: number): Promise<Report> {
  return request<Report>(`/reports/${reportId}/dismiss`, { method: "POST" });
}
