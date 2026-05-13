import { apiClient } from './apiClient';

export const exportService = {
  exportPDF: async (
    grupoId: string,
    token: string
  ): Promise<{ html: string }> => {
    const res = await apiClient.post<{ ok: boolean; data: { html: string } }>(
      '/api/export/pdf',
      { grupoId },
      token
    );
    return res.data;
  },

  exportPNG: async (
    grupoId: string,
    token: string
  ): Promise<{ html: string }> => {
    const res = await apiClient.post<{ ok: boolean; data: { html: string } }>(
      '/api/export/png',
      { grupoId },
      token
    );
    return res.data;
  },

  getShareLink: async (
    grupoId: string,
    token: string
  ): Promise<{ shareUrl: string; token: string }> => {
    const res = await apiClient.get<{
      ok: boolean;
      data: { shareUrl: string; token: string };
    }>(`/api/export/share-link/${grupoId}`, token);
    return res.data;
  },
};
