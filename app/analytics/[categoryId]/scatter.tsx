'use client'

// 상관 산점도 — 계수 하나만 보여주면 청중이 관계의 모양(선형인지, 군집인지, 이상치가
// 끄는지)을 판단할 수 없다. Recharts는 클라이언트 전용이라 서버 컴포넌트인 대시보드에서
// 분리한다.
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

// 카테고리 하나가 1만 점을 넘어 전량 렌더는 브라우저가 버겁다. 균등 간격으로 솎아
// 분포 모양을 보존하면서 상한을 둔다(무작위 표본이 아니라 결정론적이라 발표 때마다
// 같은 그림이 나온다).
const MAX_POINTS = 1500

function downsample<T>(points: T[], max = MAX_POINTS): T[] {
  if (points.length <= max) return points
  const step = points.length / max
  const out: T[] = []
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)])
  return out
}

export function CorrelationScatter({ points }: { points: { x: number; y: number }[] }) {
  const shown = downsample(points)

  return (
    <div>
      <div className="mt-3 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {/* left 여백은 세로 Y축 라벨이 눈금 숫자와 겹치지 않을 만큼 필요하다. */}
          <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="x"
              name="당류"
              unit="g"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ value: '당류 (100g·100ml당, g)', position: 'insideBottom', offset: -16, fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="건강 점수"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{
                value: '건강 점수 (낮을수록 건강)',
                angle: -90,
                position: 'insideLeft',
                offset: -12,
                style: { textAnchor: 'middle' },
                fontSize: 12,
                fill: '#6b7280',
              }}
            />
            <ZAxis range={[12, 12]} />
            {/* 단위는 XAxis의 unit이 붙여준다 — 커스텀 formatter는 Recharts의
                ValueType(undefined 포함)과 시그니처가 어긋나 타입이 깨진다. */}
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            {/* 리사이즈마다 애니메이션이 재시작해 점이 잠깐 사라지는 것을 막는다. */}
            <Scatter data={shown} fill="#f97316" fillOpacity={0.35} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {shown.length < points.length && (
        <p className="mt-1 text-xs text-gray-400">
          표본 {points.length.toLocaleString()}개 중 {shown.length.toLocaleString()}개를 균등 간격으로 추출해 그렸습니다
          (상관계수는 전량으로 계산).
        </p>
      )}
    </div>
  )
}
