import React from 'react';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import _ from 'lodash';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const RadarChartComponent = ({ data, options }: any) => {


    const defaultOptions = {
        "scales": {
            "r": {
                "angleLines": {
                    "color": "rgba(200,200,200,0.7",
                    "lineWidth": 1.5
                },
                "grid": {
                    "color": "rgba(255, 255, 255, 0.5)",
                    "lineWidth": 1.2
                },
                "pointLabels": {
                    "color": "rgba(220,220,220,0.7)",
                    "font": {
                        "size": 12
                    }
                },
                "suggestedMin": 0
            }
        }
    }
    
    const deepMergedOptions = _.merge(defaultOptions, options);
    //console.log("data=", data, "options=", options, "merged options=", deepMergedOptions);    
  return  <div style={{ width: '300px', height: '300px' }}><Radar data={data} options={deepMergedOptions} /></div>;
};

export default RadarChartComponent;