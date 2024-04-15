// ChartRenderer.tsx
import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import cubejs, { CubeApi } from '@cubejs-client/core';
import { QueryRenderer } from '@cubejs-client/react';
import { Spin, Table } from 'antd';
//import 'antd/dist/antd.css';
import { useDeepCompareMemo } from 'use-deep-compare';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const COLORS_SERIES: string[] = ['#5b8ff9', '#5ad8a6', '#5e7092', '#f6bd18', '#6f5efa', '#6ec8ec', '#945fb9', '#ff9845', '#299796', '#fe99c3'];
const PALE_COLORS_SERIES: string[] = ['#d7e3fd', '#daf5e9', '#d6dbe4', '#fdeecd', '#dad8fe', '#dbf1fa', '#e4d7ed', '#ffe5d2', '#cce5e4', '#ffe6f0'];

interface ChartProps {
  resultSet: any; // Define more specific types based on the Cube.js ResultSet format
  pivotConfig: any; // Define more specific types if possible
  onDrilldownRequested: (data: { xValues: string[], yValues: string[] }, pivotConfig: any) => void;
  chartType: 'line' | 'bar' | 'pie'; // Add more types as needed
}

const cubejsApi = cubejs(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MTMxMDkyMzUsImV4cCI6MTcxMzE5NTYzNX0.GZ1gb4OYkeI0W4xs_hv3zPuWwxOW8eXlA3zrTvAyZ7s',
    { apiUrl: 'http://localhost:4000/cubejs-api/v1' }
  );

const commonOptions = {
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
  },
  scales: {
    x: {
      ticks: {
        autoSkip: true,
        maxRotation: 0,
        padding: 12,
        minRotation: 0,
      },
    },
  },
};

const ChartComponent: React.FC<ChartProps> = ({ resultSet, pivotConfig, onDrilldownRequested, chartType }) => {
  const data = useDeepCompareMemo(() => ({
    labels: resultSet.categories(pivotConfig).map((c: any) => c.x),
    datasets: resultSet.series(pivotConfig).map((s: any, index: number) => ({
      label: s.title,
      data: s.series.map((r: any) => r.value),
      backgroundColor: COLORS_SERIES[index],
      borderColor: COLORS_SERIES[index],
      pointRadius: 1,
      tension: 0.1,
      pointHoverRadius: 1,
      borderWidth: 2,
      tickWidth: 1,
      fill: chartType === 'line' ? false : (s.chartType === 'line' ? false : true),
    })),
  }), [resultSet, pivotConfig]);

  const options = {
    ...commonOptions,
    scales: {
      ...commonOptions.scales,
      y: {
        stacked: (pivotConfig.x || []).includes('measures'),
      },
    },
  };

  const Chart = chartType === 'line' ? Line : resultSet.chartType === 'bar' ? Bar : Pie;

  return <Chart data={data} options={options} />;
};

interface RendererProps {
  query: any; // Define more specific types for your query
  //cubeApi: CubeAppi;
  pivotConfig: any; // More specific types if possible
  //chartType: 'line' | 'bar' | 'pie'; // Add more chart types as needed
}

const ChartRenderer: React.FC<RendererProps> = ({ query, pivotConfig }) => {
  console.log("ChartRenderer invoked with", query, pivotConfig, cubejsApi);
  return (    
    <div style={{ width: '100%', height: '500px' }}><QueryRenderer
      query={query}
      cubeApi={cubejsApi}
      resetResultSetOnChange={false}
      render={({ resultSet, error }) => {
        if (error) {
          return <div>Error: {error.toString()}</div>;
        }
        if (!resultSet) {
          return <Spin />;
        }
        return <ChartComponent resultSet={resultSet} pivotConfig={pivotConfig} chartType={'line'}  onDrilldownRequested={() => {}} />;
      }}
    /></div>
  );
};

export default ChartRenderer;
