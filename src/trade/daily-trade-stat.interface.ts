export interface DailyTradeStat {
    date: string;
    averagePrice: number;
    closePrice: number;
    highPrice: number;
    lowPrice: number;
    openPrice: number;
    totalAmount: number;
    totalPrice: number;
    closePriceBTC?: number | null;
    highPriceBTC?: number | null;
    lowPriceBTC?: number | null;
    openPriceBTC?: number | null;
  }
  