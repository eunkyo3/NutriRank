'use client'

// 카테고리 비교 막대 — 표만 두면 "어디가 더 나쁜가"가 숫자 대조 작업이 된다.
// 막대로 두면 한눈에 서열이 읽힌다. Recharts는 클라이언트 전용이라 분리한다.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface ComparisonDatum {
  name: string
  avgHealthScore: number
  worstShare: number | null
}

// 평균 점수가 높을수록 덜 건강하므로 상위 구간을 붉게 물들여 방향을 색으로도 전달한다.
function barColor(score: number): string {
  if (score >= 20) return '#dc2626'
  if (score >= 12) return '#f97316'
  if (score >= 5) return '#eab308'
  return '#16a34a'
}

export function CategoryComparisonChart({ data }: { data: ComparisonDatum[] }) {
  return (
    <div className="mt-4 h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 8, left: 28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} interval={0} />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            label={{
              value: '평균 건강 점수 (높을수록 덜 건강)',
              angle: -90,
              position: 'insideLeft',
              offset: -4,
              style: { textAnchor: 'middle' },
              fontSize: 12,
              fill: '#6b7280',
            }}
          />
          <Tooltip
            cursor={{ fill: '#f3f4f6' }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(v) => [typeof v === 'number' ? v.toFixed(1) : String(v), '평균 건강 점수']}
          />
          {/* 성장 애니메이션을 끈다: ResponsiveContainer가 리사이즈(창 크기 변경,
              디스플레이 전환, 스크린샷 캡처)될 때마다 애니메이션이 0에서 다시 시작해
              막대가 잠깐 사라진다. 발표 중에는 항상 즉시 그려지는 편이 안전하다. */}
          <Bar dataKey="avgHealthScore" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={barColor(d.avgHealthScore)} />
            ))}
            <LabelList
              dataKey="avgHealthScore"
              position="top"
              formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(1) : '')}
              style={{ fontSize: 12, fill: '#374151' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
