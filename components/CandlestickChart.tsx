// reuse chart whenever we need to show market data
// will only be used on client side, therefore, we have to pass server components as its children
"use client";

import {
  getCandlestickConfig,
  getChartConfig,
  PERIOD_BUTTONS,
  PERIOD_CONFIG,
} from "@/constants";
import { fetcher } from "@/lib/coingecko.actions";
import { convertOHLCData } from "@/lib/utils";
import {
  CandlestickSeries,
  createChart,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts";
import { useState, useRef, useTransition, useEffect } from "react";

const CandlestickChart = ({
  children,
  data,
  coinId,
  height = 360,
  initialPeriod = "daily",
}) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  // Store chart instance across renders
  const chartRef = useRef<IChartApi | null>(null);
  // Track instance of the candlestick series
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const latestRequestRef = useRef(0);
  const [period, setPeriod] = useState(initialPeriod);
  //Refetching data for chart whenever the period changes
  const [ohlcData, setOhlcData] = useState<OHLCData[]>(data ?? []);
  // useTransition transitions the state but keeps UI repsonsive during async updates
  const [isPending, startTransition] = useTransition();

  const fetchOHLCData = async (selectedPeriod: Period) => {
    try {
      const { days } = PERIOD_CONFIG[selectedPeriod];
      const requestId = latestRequestRef.current;
      const newData = await fetcher<OHLCData[]>(`/coins/${coinId}/ohlc`, {
        vs_currency: "usd",
        days,
        precision: "full",
      });
      if (requestId === latestRequestRef.current) {
        setOhlcData(newData ?? []);
      }
    } catch (e) {
      console.error("Failed to fetch OLHCData", e);
    }
  };

  // Which one is currently active
  const handlePeriodChange = (newPeriod: Period) => {
    if (newPeriod === period) return;

    // Can start transition before setting period
    startTransition(async () => {
      setPeriod(newPeriod);
      await fetchOHLCData(newPeriod);
    });
  };

  // useEffect to take that data and append it to chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const showTime = ["daily", "weekly", "monthly"].includes(period);

    const chart = createChart(container, {
      ...getChartConfig(height, showTime),
      width: container.clientWidth,
    });

    const series = chart.addSeries(CandlestickSeries, getCandlestickConfig());

    chartRef.current = chart;
    candleSeriesRef.current = series;

    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      chart.applyOptions({ width: entries[0].contentRect.width });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    const showTime = ["daily", "weekly", "monthly"].includes(period);

    chartRef.current.applyOptions({
      timeScale: {
        timeVisible: showTime,
        secondsVisible: false,
      },
    });

    const convertedToSeconds = ohlcData.map(
      (item) =>
        [
          Math.floor(item[0] / 1000),
          item[1],
          item[2],
          item[3],
          item[4],
        ] as OHLCData
    );

    candleSeriesRef.current.setData(convertOHLCData(convertedToSeconds));
    chartRef.current.timeScale().fitContent();
  }, [ohlcData, period]);

  return (
    <div id="candlestick-chart">
      <div className="chart-header">
        <div className="flex-1"> {children}</div>
        <div className="button-group">
          <span className="text-sm mx-2 font-medium text-purple-100/50">
            Period:
          </span>
          {PERIOD_BUTTONS.map(({ value, label }) => (
            <button
              key={value}
              className={
                period === value ? "config-button-active" : "config-button"
              }
              onClick={() => handlePeriodChange(value)}
              disabled={isPending}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} className="chart" style={{ height }} />
    </div>
  );
};

export default CandlestickChart;
