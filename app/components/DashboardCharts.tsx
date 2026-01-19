'use client';

import React, { useState, useEffect } from 'react';

interface ChartData {
  dailyActivity: Array<{
    date: string;
    latex: number;
    bpmn: number;
    records: number;
    total: number;
  }>;
  fileTypeDistribution: {
    latex: number;
    bpmn: number;
    records: number;
  };
  weeklySummary: Array<{
    week: string;
    latex: number;
    bpmn: number;
    records: number;
    total: number;
  }>;
}

interface DashboardChartsProps {
  user: any;
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ user }) => {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/dashboard/charts', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setChartData(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!chartData) {
    return null;
  }

  // Simple Bar Chart Component
  const BarChart = ({ 
    data, 
    width = 400, 
    height = 200, 
    colors = ['#3b82f6', '#8b5cf6', '#f59e0b'] 
  }: { 
    data: Array<{ label: string; values: number[] }>; 
    width?: number; 
    height?: number; 
    colors?: string[] 
  }) => {
    const maxValue = Math.max(...data.flatMap(d => d.values), 1);
    const barWidth = (width - 60) / data.length;
    const chartHeight = height - 40;
    const padding = 30;

    return (
      <svg width={width} height={height} className="w-full">
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const value = Math.ceil(maxValue * ratio);
          const y = padding + chartHeight - (chartHeight * ratio);
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x={padding - 5}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const x = padding + index * barWidth + barWidth * 0.1;
          const barGroupWidth = barWidth * 0.8;
          const individualBarWidth = barGroupWidth / item.values.length;
          
          return (
            <g key={index}>
              {item.values.map((value, valueIndex) => {
                const barHeight = (value / maxValue) * chartHeight;
                const barX = x + valueIndex * individualBarWidth;
                const barY = padding + chartHeight - barHeight;
                
                return (
                  <rect
                    key={valueIndex}
                    x={barX}
                    y={barY}
                    width={individualBarWidth * 0.9}
                    height={barHeight}
                    fill={colors[valueIndex % colors.length]}
                    rx="2"
                  />
                );
              })}
              {/* Label */}
              <text
                x={x + barGroupWidth / 2}
                y={height - 5}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Simple Line Chart Component
  const LineChart = ({ 
    data, 
    width = 400, 
    height = 200,
    color = '#3b82f6'
  }: { 
    data: Array<{ label: string; value: number }>; 
    width?: number; 
    height?: number;
    color?: string;
  }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const chartHeight = height - 40;
    const chartWidth = width - 60;
    const padding = 30;
    const pointRadius = 3;

    const points = data.map((item, index) => {
      const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - (item.value / maxValue) * chartHeight;
      return { x, y, label: item.label, value: item.value };
    });

    // Create path for line
    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    return (
      <svg width={width} height={height} className="w-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const value = Math.ceil(maxValue * ratio);
          const y = padding + chartHeight - (chartHeight * ratio);
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x={padding - 5}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />

        {/* Points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r={pointRadius}
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
            {/* Tooltip on hover would go here */}
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((point, index) => {
          if (index % Math.ceil(data.length / 7) === 0 || index === data.length - 1) {
            return (
              <text
                key={index}
                x={point.x}
                y={height - 5}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {new Date(point.label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            );
          }
          return null;
        })}
      </svg>
    );
  };


  // Prepare data for charts
  const dailyTotalData = chartData.dailyActivity.map(item => ({
    label: item.date,
    value: item.total
  }));

  const weeklyBarData = chartData.weeklySummary.map(week => ({
    label: week.week,
    values: [week.latex, week.bpmn, week.records]
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      {/* Activity Over Time (Line Chart) */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Activity Over Time (Last 30 Days)</h3>
        <div className="flex items-center justify-center">
          <LineChart 
            data={dailyTotalData} 
            width={500} 
            height={200}
            color="#3b82f6"
          />
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">Total files and records created per day</p>
      </div>

      {/* Weekly Summary (Bar Chart) */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Weekly Summary (Last 4 Weeks)</h3>
        <div className="flex items-center justify-center">
          <BarChart 
            data={weeklyBarData} 
            width={500} 
            height={200}
            colors={['#3b82f6', '#8b5cf6', '#f59e0b']}
          />
        </div>
        <div className="flex justify-center gap-4 mt-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-xs text-gray-600">LaTeX</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-500"></div>
            <span className="text-xs text-gray-600">BPMN</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-xs text-gray-600">Records</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
