import { motion } from 'motion/react';
import { computeTreeLevel } from '../utils/dateUtils';

interface FocusTreeProps {
  totalMinutes: number;
  streakDays: number;
}

export function FocusTree({ totalMinutes, streakDays }: FocusTreeProps) {
  const info = computeTreeLevel(totalMinutes);
  const lv = info.level;

  return (
    <div className="bg-[#FFFDF8] dark:bg-[#211C17] border border-[#E5DBC4] dark:border-[#362E25] rounded-3xl p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#6B6154] dark:text-[#B5A898]">
            Cấp độ hiện tại
          </p>
          <h3 className="text-lg sm:text-xl font-extrabold text-[#231E18] dark:text-[#FBF8F1] font-display mt-0.5">
            Cấp {lv} · {info.title}
          </h3>
        </div>
        <div className="text-right tabular-nums">
          <p className="text-xs font-medium text-[#6B6154] dark:text-[#B5A898]">
            Tổng tích lũy
          </p>
          <div className="text-lg sm:text-xl font-extrabold text-[#C45A15] dark:text-[#EA7D35] mt-0.5">
            {totalMinutes} phút
          </div>
        </div>
      </div>

      <div className="relative rounded-2xl bg-gradient-to-b from-[#FCF5DC] via-[#FAF0CE] to-[#F7E9BD] dark:from-[#241E18] dark:via-[#1E1914] dark:to-[#181410] border border-[#EEDDB8] dark:border-[#362E25] p-5 flex items-center justify-center overflow-hidden min-h-[250px]">
        <svg viewBox="0 0 280 245" className="w-full max-h-[240px]" fill="none">
          <motion.circle
            cx="140"
            cy="108"
            r={54 + lv * 4}
            fill="#FFFFFF"
            className="dark:fill-[#2D251C]"
            opacity="0.72"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
          />
          <motion.circle
            cx="222"
            cy="44"
            r="15"
            fill="#F6D58E"
            animate={{ scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
          />

          <ellipse cx="140" cy="222" rx="105" ry="16" fill="#EEDDB8" className="dark:fill-[#2C241B]" />

          {/* Kraft Terracotta Planter Pot */}
          <path
            d="M104 186H176L168 222H112L104 186Z"
            fill="#C45A15"
            stroke="#231E18"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <rect
            x="98"
            y="176"
            width="84"
            height="14"
            rx="6"
            fill="#DA742E"
            stroke="#231E18"
            strokeWidth="2.6"
          />

          <motion.g
            style={{ transformOrigin: '140px 176px' }}
            animate={{ rotate: [-1.8, 1.8, -1.8] }}
            transition={{ repeat: Infinity, duration: 3.8, ease: 'easeInOut' }}
          >
            {/* Trunk */}
            <path
              d={
                lv <= 2
                  ? 'M140 176V140'
                  : lv <= 4
                    ? 'M140 176V118M140 146L122 132'
                    : 'M140 176C140 152 138 130 140 96M140 142L115 122M140 132L166 114'
              }
              stroke="#6A513B"
              strokeWidth={lv >= 5 ? 10 : 7}
              strokeLinecap="round"
            />

            {lv === 1 && (
              <>
                <path d="M140 142C124 136 117 124 126 117C134 112 142 126 140 142Z" fill="#5A8F73" stroke="#2D523F" strokeWidth="2.4" />
                <path d="M140 142C156 136 163 124 154 117C146 112 138 126 140 142Z" fill="#77AC8E" stroke="#2D523F" strokeWidth="2.4" />
              </>
            )}

            {lv >= 2 && lv <= 4 && (
              <>
                <circle cx="140" cy="108" r={22 + lv * 2} fill="#5A8F73" stroke="#2D523F" strokeWidth="2.5" />
                <circle cx="118" cy="126" r="18" fill="#77AC8E" stroke="#2D523F" strokeWidth="2.3" />
                <circle cx="162" cy="126" r="16" fill="#77AC8E" stroke="#2D523F" strokeWidth="2.3" />
              </>
            )}

            {lv >= 5 && (
              <>
                <circle cx="106" cy="112" r="29" fill="#46785E" stroke="#2D523F" strokeWidth="2.5" />
                <circle cx="174" cy="110" r="29" fill="#46785E" stroke="#2D523F" strokeWidth="2.5" />
                <circle cx="140" cy="84" r={lv >= 8 ? 38 : 33} fill="#5A8F73" stroke="#2D523F" strokeWidth="2.5" />
                <circle cx="122" cy="100" r="24" fill="#77AC8E" />
                <circle cx="158" cy="98" r="22" fill="#77AC8E" />
              </>
            )}

            {lv >= 6 && (
              <>
                <circle cx="114" cy="104" r="5.5" fill="#F2B84B" stroke="#C45A15" strokeWidth="2" />
                <circle cx="164" cy="98" r="5.5" fill="#F2B84B" stroke="#C45A15" strokeWidth="2" />
              </>
            )}

            {lv >= 8 && (
              <>
                <circle cx="140" cy="68" r="6.5" fill="#FBE5B6" stroke="#C45A15" strokeWidth="2" />
                <circle cx="148" cy="114" r="5" fill="#E39036" />
                <circle cx="98" cy="116" r="4.5" fill="#FBE5B6" stroke="#C45A15" strokeWidth="1.6" />
              </>
            )}

            {lv === 10 && (
              <motion.path
                d="M140 26L144 35L154 36L147 43L149 53L140 48L131 53L133 43L126 36L136 35L140 26Z"
                fill="#F6D58E"
                stroke="#C45A15"
                strokeWidth="2.2"
                strokeLinejoin="round"
                style={{ transformOrigin: '140px 40px' }}
                animate={{ scale: [1, 1.18, 1], rotate: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              />
            )}
          </motion.g>
        </svg>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#6B6154] dark:text-[#B5A898] tabular-nums">
          <span>Tiến độ lên cấp tiếp theo</span>
          {info.nextMinutes !== null ? (
            <span className="font-bold text-[#231E18] dark:text-[#FBF8F1]">
              {totalMinutes}/{info.nextMinutes} phút ({info.progressPercent}%)
            </span>
          ) : (
            <span className="font-bold text-[#2B6334] dark:text-[#78C282]">
              Đã đạt cấp tối đa · Chuỗi {streakDays} ngày
            </span>
          )}
        </div>
        <div className="h-2.5 w-full rounded-full bg-[#EFE7D6] dark:bg-[#312920] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#3E7052] dark:bg-[#6BAF84] transition-all duration-500"
            style={{ width: `${info.progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
