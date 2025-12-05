/**
 * Finnhub API Client (STUBBED)
 * Temporarily disabled to avoid API limits and 403 errors.
 */

import type { ShortInterestData, NewsItem, FinnhubMetrics, StockQuote, CompanyProfile } from '../../types';

export const getCompanyProfile2 = async (_symbol: string): Promise<CompanyProfile | null> => {
  return null;
};

export const getQuote = async (_symbol: string): Promise<StockQuote | null> => {
  return null;
};

export const getShortInterest = async (_symbol: string): Promise<ShortInterestData | null> => {
  return null;
};

export const getCompanyNews = async (_symbol: string, _days: number = 30): Promise<NewsItem[]> => {
  return [];
};

export const getBasicFinancials = async (_symbol: string): Promise<FinnhubMetrics | null> => {
  return null;
};
