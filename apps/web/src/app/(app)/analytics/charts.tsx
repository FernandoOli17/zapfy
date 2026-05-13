'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PRIMARY = 'hsl(142 70% 45%)';
const MUTED = 'hsl(240 5% 64%)';

export function MessagesPerDayChart({
  data,
}: {
  data: Array<{ date: string; count: number; label: string }>;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="gradMessages" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.4} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            stroke={MUTED}
            tick={{ fill: MUTED, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={MUTED}
            tick={{ fill: MUTED, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(240 6% 8%)',
              border: '1px solid hsl(240 3.7% 15.9%)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: MUTED }}
            formatter={(value) => [Number(value).toLocaleString('pt-BR'), 'mensagens']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={PRIMARY}
            strokeWidth={2}
            fill="url(#gradMessages)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConversationsByStatusChart({
  data,
}: {
  data: Array<{ name: string; value: number; color: string }>;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="flex h-64 items-center">
      <div className="h-full w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(240 6% 8%)',
                border: '1px solid hsl(240 3.7% 15.9%)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) => {
                const v = Number(value);
                return [
                  `${v.toLocaleString('pt-BR')} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`,
                  String(name),
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-1 flex-col gap-2 pl-4">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: d.color }}
              aria-hidden
            />
            <span className="flex-1">{d.name}</span>
            <span className="tabular-nums text-muted-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TopTagsChart({ data }: { data: Array<{ tag: string; count: number }> }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 0, left: 10 }}>
          <XAxis
            type="number"
            stroke={MUTED}
            tick={{ fill: MUTED, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            dataKey="tag"
            type="category"
            stroke={MUTED}
            tick={{ fill: MUTED, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(240 6% 8%)',
              border: '1px solid hsl(240 3.7% 15.9%)',
              borderRadius: 8,
              fontSize: 12,
            }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            formatter={(value) => [Number(value).toLocaleString('pt-BR'), 'contatos']}
          />
          <Bar dataKey="count" fill={PRIMARY} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
