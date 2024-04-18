// chartcube.d.ts
import React from 'react';

interface ChartRendererProps {
  query: any; // Specify a more precise type if possible
  pivotConfig: any; // Specify a more precise type if possible
}

declare const ChartRenderer: React.ComponentType<ChartRendererProps>;
export default ChartRenderer;
