import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCheck,
  CheckCircle2,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  ShieldCheck,
  Star,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { signInWithGoogle } from '../firebase';
import { MascotMood, UserRole } from '../types';
import {
  HeartbeatSlogan,
  MascotAvatar,
  NhiphocAnimatedLogo,
  NhiphocLogoMark,
} from './NhipNhoMascot';
import { isSoundEnabled, playClickSound, playMascotSound, setSoundEnabled } from '../utils/sound';

const ROLE_CARDS: Array<{
  role: UserRole;
  title: string;
  subtitle: string;
  features: string[];
  icon: React.FC<{ className?: string }>;
}> = [
  {
    role: 'student',
    title: 'Học sinh',
    subtitle: 'Tập trung sâu trên từng trang note',
    features: [
      'Danh sách bài tập hôm nay & bài tập tự luyện bổ sung',
      'Chụp ảnh bài làm trực tiếp bằng camera, tự động nén rõ chữ',
      'Đồng hồ Pomodoro & Cây Tập Trung lưu lại từng phút học',
    ],
    icon: GraduationCap,
  },
  {
    role: 'parent',
    title: 'Phụ huynh',
    subtitle: 'Giấy note dịu mắt, theo dõi an tâm',
    features: [
      'Tổng quan tỷ lệ hoàn thành, phút tập trung & ảnh bài của con',
      'Đặt lịch học / check-in và theo dõi xác nhận theo thời gian thực',
      'Nhắn tin trực tiếp & gửi phiếu phản hồi / hỗ trợ tới trợ lý',
    ],
    icon: HeartHandshake,
  },
  {
    role: 'assistant',
    title: 'Trợ lý',
    subtitle: 'Quản lý danh sách & chấm bài tức thì',
    features: [
      'Quản lý nhiều học sinh qua mã kết nối NH... và giao bài theo ngày',
      'Xem ảnh bài nộp, chấm điểm chữ & gửi nhận xét chi tiết ngay trên web',
      'Bật trạng thái Đang trực tuyến, xác nhận lịch hẹn & trả lời hỗ trợ',
    ],
    icon: Users,
  },
];

const MASCOT_MOODS: Array<{
  mood: MascotMood;
  label: string;
  caption: string;
}> = [
  {
    mood: 'happy',
    label: 'Vui vẻ',
    caption: 'Chào bạn! Nhịp Nhỏ sẽ đồng hành giúp bạn giữ nhịp học êm ái mỗi ngày.',
  },
  {
    mood: 'trying',
    label: 'Cố gắng',
    caption: 'Chỉ cần tập trung trọn 25 phút thôi — từng dòng note nhỏ tạo nên tiến bộ lớn.',
  },
  {
    mood: 'surprised',
    label: 'Bất ngờ',
    caption: 'Ting! Trợ lý vừa gửi nhận xét và chấm xong bài tập bạn vừa nộp ảnh đấy.',
  },
  {
    mood: 'relax',
    label: 'Thư giãn',
    caption: 'Xong phiên học rồi! Nghỉ mắt một chút để giữ sự tỉnh táo cho chặng tiếp theo.',
  },
  {
    mood: 'creative',
    label: 'Sáng tạo',
    caption: 'Cùng Nhịp Nhỏ thử sức thêm bài tập bổ sung và vẽ nên những ý tưởng mới thật vui!',
  },
];

export function AuthScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [selectedMood, setSelectedMood] = useState<MascotMood>('happy');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playMascotSound('happy');
  };

  const handleLogin = async () => {
    playClickSound();
    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể đăng nhập Google. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  const activeMoodMeta = MASCOT_MOODS.find((m) => m.mood === selectedMood) || MASCOT_MOODS[0];
  const activeRoleCard = ROLE_CARDS.find((r) => r.role === selectedRole) || ROLE_CARDS[0];

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#231E18] flex flex-col">
      {/* Sticky Top Navigation Bar (3 exact zones) */}
      <header className="border-b border-[#E5DBC4] bg-[#FBF8F1]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1240px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#intro"
            className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[#231E18] whitespace-nowrap shrink-0 font-display"
          >
            <NhiphocLogoMark className="w-8 h-8 shrink-0" />
            <span>
              Nhịp<span className="text-[#C45A15]">Học</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6B6154]">
            <a href="#intro" className="hover:text-[#C45A15] transition-colors whitespace-nowrap shrink-0">
              Giới thiệu
            </a>
            <a href="#features" className="hover:text-[#C45A15] transition-colors whitespace-nowrap shrink-0">
              Tính năng
            </a>
            <a href="#guide" className="hover:text-[#C45A15] transition-colors whitespace-nowrap shrink-0">
              Hướng dẫn
            </a>
            <a href="#start-panel" className="hover:text-[#C45A15] transition-colors whitespace-nowrap shrink-0">
              Bắt đầu
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleSound}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5DBC4] bg-white text-xs font-bold text-[#5C5347] hover:bg-[#FDF3D0] hover:text-[#231E18] transition-colors whitespace-nowrap shrink-0"
              aria-label={soundOn ? 'Tắt âm thanh nhấn' : 'Bật âm thanh nhấn'}
            >
              {soundOn ? (
                <Volume2 className="w-3.5 h-3.5 text-[#C45A15]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-[#8A7D6B]" />
              )}
              <span className="hidden sm:inline">{soundOn ? 'Âm thanh' : 'Đã tắt tiếng'}</span>
            </button>

            <a
              href="#start-panel"
              className="px-4 py-2 rounded-xl bg-[#C45A15] text-white text-xs font-bold hover:bg-[#AA4C0F] transition-colors whitespace-nowrap shrink-0"
            >
              Đăng nhập / Bắt đầu
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Section 1: Hero Banner */}
        <section id="intro" className="relative overflow-hidden border-b border-[#E5DBC4]">
          <div className="absolute inset-0 nhiphoc-grid-bg opacity-70 pointer-events-none" />
          <div className="relative max-w-[1240px] mx-auto px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-7">
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
                <HeartbeatSlogan />
              </div>

              <h1
                className="font-extrabold tracking-tight text-[#231E18] leading-[1.12] font-display"
                style={{ fontSize: 'clamp(2.35rem, 4.1vw, 3.55rem)', textWrap: 'balance' }}
              >
                Giữ nhịp tập trung trên từng trang note cùng{' '}
                <span className="text-[#C45A15]">NhịpHọc</span>
              </h1>

              <p className="text-base sm:text-lg text-[#5C5347] leading-relaxed max-w-xl">
                Thiết kế lấy cảm hứng từ giấy note kem dịu mắt giúp giảm mỏi thị giác và tăng khả
                năng chú ý khi tự học. Mọi bài tập, ảnh bài làm, giờ tập trung Pomodoro và lời
                nhận xét đều đồng bộ theo thời gian thực.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
                >
                  <span>{loading ? 'Đang mở Google...' : 'Bắt đầu ngay bằng Google'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#guide"
                  onClick={() => playClickSound()}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-[#E5DBC4] bg-white text-sm font-semibold text-[#231E18] hover:bg-[#FDF3D0] transition-colors whitespace-nowrap"
                >
                  Xem hướng dẫn 3 bước
                </a>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 max-w-xl"
                >
                  {errorMsg}
                </div>
              )}

              <div className="pt-4 border-t border-[#E5DBC4] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#6B6154]">
                <span>Tông màu giấy note chống lóa</span>
                <span aria-hidden="true">·</span>
                <span>Chụp ảnh nộp bài trực tiếp</span>
                <span aria-hidden="true">·</span>
                <span>Lưu trữ đồng bộ đa thiết bị</span>
              </div>
            </div>

            {/* Hero Right: Nhịp Nhỏ Living Animated Showcase */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-[#E5DBC4] bg-[#FDF3D0] p-6 sm:p-8 space-y-6 shadow-[0_22px_50px_-30px_rgba(35,30,24,0.22)]">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#8A6D46] border-b border-[#EBDAB0] pb-3">
                  <HeartbeatSlogan />
                  <span className="font-mono-code tabular-nums shrink-0">Nhịp Nhỏ</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <NhiphocAnimatedLogo size="md" />
                    <motion.div
                      key={selectedMood}
                      initial={{ scale: 0.9, y: 8 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                      className="flex items-center justify-center shrink-0"
                    >
                      <MascotAvatar size="2xl" mood={selectedMood} />
                    </motion.div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-[#C45A15]">
                      Linh vật Nhịp Nhỏ (Chạm để tương tác)
                    </p>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#231E18]">
                      Chú bút chì đồng hành giữ nhịp tập trung
                    </h2>
                    <p className="text-sm text-[#4F463B] leading-relaxed">
                      {activeMoodMeta.caption}
                    </p>
                  </div>
                </div>

                {/* Interactive Mood Switcher */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-[#6B6154]">
                    Chọn biểu cảm hoạt cảnh của Nhịp Nhỏ:
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {MASCOT_MOODS.map((item) => {
                      const active = selectedMood === item.mood;
                      return (
                        <button
                          key={item.mood}
                          type="button"
                          onClick={() => {
                            setSelectedMood(item.mood);
                            playMascotSound(item.mood);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-[#C45A15] text-white shadow-sm'
                              : 'bg-white text-[#5C5347] border border-[#E5DBC4] hover:text-[#231E18]'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Note Preview Snippet */}
                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#231E18]">Ghi chú nhiệm vụ hôm nay</span>
                    <span className="font-mono-code font-bold text-[#C45A15] tabular-nums">
                      3/4 hoàn thành
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#FDF3D0] overflow-hidden">
                    <div className="h-full w-3/4 bg-[#C45A15] rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#6B6154] pt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCheck className="w-3.5 h-3.5 text-[#3F6A52]" />
                      Toán học: Đã chấm xong (9.5/10)
                    </span>
                    <span className="font-mono-code tabular-nums text-[#C45A15] font-semibold">
                      25:00
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Dedicated Feature Blocks */}
        <section id="features" className="bg-white py-20 border-b border-[#E5DBC4]">
          <div className="max-w-[1240px] mx-auto px-6 space-y-14">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-bold text-[#C45A15]">Tính năng theo từng vai trò</p>
              <h2
                className="text-3xl sm:text-4xl font-extrabold text-[#231E18] leading-tight"
                style={{ textWrap: 'balance' }}
              >
                Ba không gian chuyên biệt kết nối nhịp nhàng trong một hệ thống
              </h2>
              <p className="text-base text-[#6B6154] leading-relaxed">
                Mỗi tài khoản bước vào đúng giao diện mình cần: Học sinh rèn thói quen tập trung,
                Phụ huynh nắm bắt an tâm, Trợ lý theo dõi và phản hồi kịp thời.
              </p>
            </div>

            {/* Block 01: Student Space */}
            <div className="rounded-3xl border border-[#E5DBC4] bg-[#FBF8F1] p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-2.5 text-xs font-bold text-[#C45A15]">
                  <span>01. Không gian Học sinh</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#6B6154]">Giấy note sáng ấm</span>
                </div>
                <h3 className="text-2xl font-extrabold text-[#231E18]">
                  Hoàn thành bài tập, chụp ảnh vở & nuôi lớn Cây Tập Trung
                </h3>
                <p className="text-sm text-[#5C5347] leading-relaxed">
                  Tách biệt rõ ràng tab Hôm nay và Bổ sung. Chụp ảnh bài làm bằng camera trực tiếp
                  trên máy, nén gọn tự động, chạy đồng hồ Pomodoro từ 1–180 phút để cây lớn dần qua
                  10 cấp độ và duy trì chuỗi ngày học.
                </p>
              </div>
              <div className="lg:col-span-6 rounded-2xl border border-[#E5DBC4] bg-white p-5 space-y-3 nhiphoc-ruled-note">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#C45A15]">Toán đại số · Hôm nay</span>
                  <span className="text-[#3F6A52]">Đã nộp ảnh · Chờ chấm</span>
                </div>
                <p className="font-bold text-base text-[#231E18]">
                  Giải hệ phương trình bậc nhất (5 bài)
                </p>
                <p className="text-xs text-[#6B6154]">
                  Ghi chú gửi trợ lý: Em đã làm xong phần a và b, nhờ thầy xem giúp câu c ạ.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Block 02: Parent Dark Mode */}
              <div className="lg:col-span-6 rounded-3xl border border-[#3A3227] bg-[#c45a15] text-[#F7F2E7] p-7 sm:p-9 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#E6B87D]">
                    <span>02. Không gian Phụ huynh</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#FDF3D0]">Giấy note sáng ấm</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-white">
                    Nắm bắt tiến độ của con và đồng hành cùng Trợ lý
                  </h3>
                  <p className="text-sm text-[#FDF3D0] leading-relaxed">
                    Giao diện giấy note sáng ấm đồng bộ giúp phụ huynh theo dõi bài tập cùng con
                    thoải mái. Xem tỷ lệ hoàn thành, thời gian tập trung, ảnh bài làm của con, đặt
                    lịch hẹn check-in và gửi phiếu phản hồi trực tiếp.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#3A3227] bg-[#ffffff] font-bold p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#ff9b00]">Tổng quan hôm nay</span>
                    <span className="font-mono-code font-bold text-[#E6B87D] tabular-nums">
                      Chuỗi 7 ngày · 95 phút
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Star className="w-4 h-4 text-[#C45A15] shrink-0 mt-0.5 animate-star-twinkle" />
                    <p className="text-xs text-[#000000] leading-relaxed">
                      Con đã hoàn thành bài Toán & Tiếng Anh, Cây Tập Trung đạt cấp 4.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#3A3227] flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-[#E6B87D] shrink-0 mt-0.5 animate-glow-pulse" />
                    <p className="text-xs text-[#000000] leading-relaxed">
                      Đặt lịch check-in 15 phút hoặc nhắn tin trực tiếp với Trợ lý bất cứ lúc nào.
                    </p>
                  </div>
                </div>
              </div>

              {/* Block 03: Assistant */}
              <div className="lg:col-span-6 rounded-3xl border border-[#E5DBC4] bg-[#FBF8F1] p-7 sm:p-9 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-[#C45A15]">
                    <span>03. Không gian Trợ lý</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#6B6154]">Điều phối & Chấm bài trực tiếp</span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#231E18]">
                    Quản lý học sinh, chấm ảnh bài làm và xác nhận lịch hẹn
                  </h3>
                  <p className="text-sm text-[#5C5347] leading-relaxed">
                    Trợ lý quản lý danh sách học sinh, giao bài tập hôm nay hoặc bổ sung, xem ảnh
                    bài làm để chấm điểm chữ kèm nhận xét, bật trạng thái Đang trực và phản hồi
                    phiếu hỗ trợ.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5DBC4] bg-white p-5 space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#231E18]">Hàng chờ chấm bài ảnh</span>
                    <span className="font-semibold text-[#C45A15]">Đang trực tuyến</span>
                  </div>
                  <div className="space-y-2 text-xs text-[#5C5347]">
                    <div className="flex items-center justify-between py-2 border-b border-[#EFE6D2]">
                      <span>Minh Anh · Toán học (Ảnh bài làm)</span>
                      <span className="font-bold text-[#C45A15]">Chấm bài →</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#3F6A52]" />
                        Lịch hẹn phụ huynh: 19:30 Thứ 5
                      </span>
                      <span className="font-semibold text-[#3F6A52]">Đã xác nhận</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: 3-Step Guide */}
        <section id="guide" className="bg-[#FBF8F1] py-20 border-b border-[#E5DBC4]">
          <div className="max-w-[1240px] mx-auto px-6 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-xl space-y-2">
                <p className="text-xs font-bold text-[#C45A15]">Hướng dẫn sử dụng</p>
                <h2 className="text-3xl font-extrabold text-[#231E18]">
                  Bắt đầu đồng hành chỉ với 3 bước đơn giản
                </h2>
              </div>
              <p className="text-sm text-[#6B6154] max-w-md">
                Dữ liệu lưu trữ an toàn trên Cloud Firestore — đăng nhập lại ở máy tính hay điện
                thoại đều giữ nguyên toàn bộ tiến độ.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-7 rounded-2xl border border-[#E5DBC4] bg-white space-y-3">
                <p className="text-xs font-mono-code font-bold text-[#C45A15]">Bước 01</p>
                <h3 className="text-lg font-bold text-[#231E18]">
                  Đăng nhập & kết nối bằng mã NH
                </h3>
                <p className="text-sm text-[#5C5347] leading-relaxed">
                  Đăng nhập bằng Google và chọn vai trò Học sinh, Phụ huynh hoặc Trợ lý. Dùng mã{' '}
                  <span className="font-mono-code font-semibold text-[#231E18]">NH...</span> để
                  liên kết cùng một hồ sơ học tập.
                </p>
              </div>

              <div className="p-7 rounded-2xl border border-[#E5DBC4] bg-[#FDF3D0]/75 space-y-3">
                <p className="text-xs font-mono-code font-bold text-[#C45A15]">Bước 02</p>
                <h3 className="text-lg font-bold text-[#231E18]">
                  Chụp ảnh nộp bài & bấm giờ tập trung
                </h3>
                <p className="text-sm text-[#5C5347] leading-relaxed">
                  Học sinh xem danh sách việc cần làm, bật đồng hồ Pomodoro nuôi Cây Tập Trung và
                  chụp ảnh trang vở để gửi bài ngay.
                </p>
              </div>

              <div className="p-7 rounded-2xl border border-[#E5DBC4] bg-white space-y-3">
                <p className="text-xs font-mono-code font-bold text-[#C45A15]">Bước 03</p>
                <h3 className="text-lg font-bold text-[#231E18]">
                  Nhận xét tức thì & giữ nhịp mỗi tối
                </h3>
                <p className="text-sm text-[#5C5347] leading-relaxed">
                  Trợ lý chấm ảnh bài làm kèm lời nhận xét; Phụ huynh nhận thông báo real-time, đặt
                  lịch check-in và nhắn tin cùng con.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Start Panel */}
        <section id="start-panel" className="bg-white py-20 border-b border-[#E5DBC4]">
          <div className="max-w-[1240px] mx-auto px-6">
            <div className="rounded-3xl border border-[#E5DBC4] bg-[#FBF8F1] p-7 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-5">
                <p className="text-xs font-bold text-[#C45A15]">Sẵn sàng vào bàn học</p>
                <h2 className="text-3xl font-extrabold text-[#231E18]">
                  Bắt đầu với NhịpHọc chỉ trong 10 giây
                </h2>
                <p className="text-sm text-[#5C5347] leading-relaxed">
                  Dù bạn là Học sinh đang luyện tập, Phụ huynh muốn đồng hành buổi tối, hay Trợ lý
                  quản lý lớp học — toàn bộ dữ liệu đều đồng bộ mượt mà.
                </p>
                <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#F3ECDC] border border-[#E5DBC4]">
                  {ROLE_CARDS.map((item) => {
                    const Icon = item.icon;
                    const active = selectedRole === item.role;
                    return (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setSelectedRole(item.role);
                        }}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                          active
                            ? 'bg-[#C45A15] text-white shadow-sm'
                            : 'text-[#5C5347] hover:text-[#231E18]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-6 space-y-5">
                <div className="rounded-2xl border border-[#E5DBC4] text-[#231E18] p-6 space-y-4 transition-colors bg-[#ffffff]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#C45A15]">
                      Không gian {activeRoleCard.title}
                    </p>
                    <span className="text-xs text-[#6B6154]">
                      {activeRoleCard.subtitle}
                    </span>
                  </div>
                  <ul className="space-y-2.5">
                    {activeRoleCard.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#C45A15]" />
                        <span className="text-[#000000]">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3.5 px-5 rounded-2xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] disabled:opacity-50 transition-colors flex items-center justify-center gap-3 shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-[#FDF3D0]" />
                  <span>{loading ? 'Đang mở đăng nhập...' : 'Đăng nhập / Đăng ký bằng Google'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Full Website Footer */}
      <footer className="bg-[#F6EFE0] py-12 text-[#5C5347]">
        <div className="max-w-[1240px] mx-auto px-6 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <NhiphocLogoMark className="w-8 h-8 shrink-0" />
                <span className="text-lg font-extrabold text-[#231E18]">
                  Nhịp<span className="text-[#C45A15]">Học</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                Nền tảng đồng hành học tập theo nhịp điệu tự nhiên cùng linh vật Nhịp Nhỏ — sử dụng
                bảng màu giấy note dịu mắt để nuôi dưỡng sự tập trung bền bỉ mỗi ngày.
              </p>
            </div>
            <div className="md:col-span-3 space-y-3 text-sm">
              <p className="font-bold text-[#231E18]">Điều hướng trang</p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#intro" className="hover:text-[#C45A15] transition-colors">
                    Giới thiệu NhịpHọc
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-[#C45A15] transition-colors">
                    Tính năng cho 3 vai trò
                  </a>
                </li>
                <li>
                  <a href="#guide" className="hover:text-[#C45A15] transition-colors">
                    Hướng dẫn 3 bước
                  </a>
                </li>
                <li>
                  <a href="#start-panel" className="hover:text-[#C45A15] transition-colors">
                    Đăng nhập / Bắt đầu ngay
                  </a>
                </li>
              </ul>
            </div>
            <div className="md:col-span-4 space-y-3 text-sm">
              <p className="font-bold text-[#231E18]">Ba không gian đồng bộ</p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-[#C45A15]" />
                  <span>Học sinh: Bài tập hôm nay · Chụp ảnh · Cây tập trung</span>
                </li>
                <li className="flex items-center gap-2">
                  <HeartHandshake className="w-3.5 h-3.5 text-[#C45A15]" />
                  <span>Phụ huynh: Tiến độ con · Cây xanh · Lịch hẹn</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#C45A15]" />
                  <span>Trợ lý: Chấm bài ảnh · Nhận xét tức thì · Phản hồi</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-[#E5DBC4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6B6154]">
            <span>© {new Date().getFullYear()} NhịpHọc · Đồng hành cùng Nhịp Nhỏ</span>
            <span>Lưu trữ & đồng bộ thời gian thực trên Firebase Cloud Firestore</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
