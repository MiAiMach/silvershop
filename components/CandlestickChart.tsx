// reuse chart whenever we need to show market data
// will only be used on client side, therefore, we have to pass server components as its children
"use client";

import {
  getCandlestickConfig,
  getChartConfig,
  navItems,
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
import {
  useState,
  useRef,
  useTransition,
  useEffect,
  use,
  useEffectEvent,
  useLayoutEffect,
} from "react";

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

  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(initialPeriod);
  //Refetching data for chart whenever the period changes
  const [ohlcData, setOhlcData] = useState<OHLCData[]>(data ?? []);
  // useTransition transitions the state but keeps UI repsonsive during async updates
  const [isPending, startTransition] = useTransition();

  const fetchOHLCData = async (selectedPeriod: Period) => {
    try {
      const { days } = PERIOD_CONFIG[selectedPeriod];

      const newData = await fetcher<OHLCData[]>(`/coins/${coinId}/ohlc`, {
        vs_currency: "usd",
        days,
        precision: "full",
      });
      // if the data changes
      setOhlcData(newData ?? []);
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
    // feeding data into chart
    const container = chartContainerRef.current;
    if (!container) return;

    const showTime = ["daily", "weekly", "monthly"].includes(period);
    const chart = createChart(container, {
      ...getChartConfig(height, showTime),
      width: container.clientWidth,
    });

    const series = chart.addSeries(CandlestickSeries, getCandlestickConfig());

    series.setData(convertOHLCData(ohlcData));

    // makes candlesticks fill out entire chart
    chart.timeScale().fitContent();

    // store chart instance into refs for later updates
    chartRef.current = chart;
    candleSeriesRef.current = series;

    // manually handle the observer (which is for resizing)

    const observer = new ResizeObserver((entires) => {
      if (!entires.length) return;
      chart.applyOptions({ width: entires[0].contentRect.width });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove(); // destroying chart instance to prevent memory leaks
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [height]);

  // make the chart work with different periods
  useEffect(() => {
    if (!candleSeriesRef.current) return;

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
    const converted = convertOHLCData(convertedToSeconds);
    candleSeriesRef.current.setData(converted);
    chartRef.current?.timeScale().fitContent();
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
              disabled={loading}
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
