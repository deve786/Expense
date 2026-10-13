import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { CatTotal, DayTotal } from './stats';
import { useTheme } from './theme';
import { T } from './ui';

export function Donut({ data, size = 170, center }: { data: CatTotal[]; size?: number; center?: string }) {
  const { c } = useTheme();
  const total = data.reduce((a, d) => a + d.total, 0);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={stroke} fill="none" />
          {total > 0 &&
            data.map((d) => {
              const len = (d.total / total) * circ;
              const el = (
                <Circle
                  key={d.name}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={d.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${Math.max(len - 2, 0)} ${circ}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <T size={12} sub>Total</T>
        <T size={18} weight="700">{center ?? ''}</T>
      </View>
    </View>
  );
}

export function Bars({ data, width, height = 150 }: { data: DayTotal[]; width: number; height?: number }) {
  const { c } = useTheme();
  const max = Math.max(...data.map((d) => d.total), 1);
  const padB = 20;
  const chartH = height - padB;
  const n = Math.max(data.length, 1);
  const slot = width / n;
  const barW = Math.max(Math.min(slot * 0.62, 28), 2);
  const labelEvery = n > 24 ? 5 : n > 12 ? 2 : 1;
  return (
    <Svg width={width} height={height}>
      <Line x1={0} y1={chartH} x2={width} y2={chartH} stroke={c.line} strokeWidth={1} />
      {data.map((d, i) => {
        const h = (d.total / max) * (chartH - 6);
        const x = i * slot + (slot - barW) / 2;
        return (
          <G key={d.date}>
            <Rect x={x} y={chartH - h} width={barW} height={Math.max(h, d.total > 0 ? 2 : 0)} rx={Math.min(barW / 2, 4)} fill={c.accent} />
            {i % labelEvery === 0 && (
              <SvgText x={x + barW / 2} y={height - 4} fontSize={10} fill={c.sub} textAnchor="middle">
                {d.label}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}
