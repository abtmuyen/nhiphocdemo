import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, RefreshCw, Upload, X } from 'lucide-react';
import { compressCanvasToDataUrl, compressImageToDataUrl } from '../utils/imageCompress';
import { playClickSound } from '../utils/sound';

interface CameraCaptureModalProps {
  open: boolean;
  assignmentTitle: string;
  initialImageUrl?: string;
  initialNote?: string;
  locked?: boolean;
  onClose: () => void;
  onSubmit: (imageDataUrl: string, studentNote: string) => Promise<void>;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  open,
  assignmentTitle,
  initialImageUrl = '',
  initialNote = '',
  locked = false,
  onClose,
  onSubmit,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialImageUrl);
  const [note, setNote] = useState(initialNote);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (open) {
      setPreviewUrl(initialImageUrl);
      setNote(initialNote);
      setErrorMsg(null);
      setCameraError(null);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, initialImageUrl, initialNote]);

  if (!open) return null;

  const startCamera = async () => {
    playClickSound();
    setCameraError(null);
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Trình duyệt này chưa hỗ trợ camera trực tiếp. Hãy chọn ảnh từ máy nhé.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError(
        'Không mở được camera (có thể trình duyệt chưa cấp quyền). Bạn có thể chọn ảnh từ máy bên dưới.',
      );
    }
  };

  const captureFrame = () => {
    playClickSound();
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMsg('Camera chưa sẵn sàng, vui lòng đợi thêm 1 giây rồi chụp lại.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    try {
      const compressed = compressCanvasToDataUrl(canvas);
      setPreviewUrl(compressed);
      stopCamera();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không xử lý được ảnh vừa chụp.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const compressed = await compressImageToDataUrl(file);
      setPreviewUrl(compressed);
      stopCamera();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không đọc được tệp ảnh.');
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked || submitting) return;
    if (!previewUrl && !note.trim()) {
      setErrorMsg('Hãy chụp ảnh trang vở hoặc viết ghi chú trước khi nộp bài.');
      return;
    }
    playClickSound();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(previewUrl, note);
      stopCamera();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Nộp bài không thành công.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
    >
      <div className="w-full max-w-xl bg-[#FFFDF8] border border-[#E5DBC4] rounded-3xl overflow-hidden shadow-xl my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFE6D2]">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-bold text-[#C45A15]">
              {locked ? 'Bài đã được chấm' : 'Chụp ảnh nộp bài'}
            </p>
            <h3 id="camera-modal-title" className="text-base font-bold text-[#231E18] truncate">
              {assignmentTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              stopCamera();
              onClose();
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#6B6154] hover:bg-[#FDF3D0] hover:text-[#231E18] transition-colors"
            aria-label="Đóng cửa sổ nộp bài"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          <div className="rounded-2xl border border-[#E5DBC4] bg-[#FBF8F1] overflow-hidden">
            {cameraActive ? (
              <div className="relative bg-[#181511]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-72 object-contain mx-auto"
                />
                <div className="p-3 flex items-center justify-center gap-3 bg-[#231E18]/90">
                  <button
                    type="button"
                    onClick={captureFrame}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] transition-colors whitespace-nowrap"
                  >
                    <Camera className="w-4 h-4" />
                    Chụp ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      stopCamera();
                    }}
                    className="px-4 py-2.5 rounded-xl border border-white/25 text-white text-sm font-medium hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    Hủy camera
                  </button>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Ảnh bài tập đã chụp"
                  referrerPolicy="no-referrer"
                  className="w-full max-h-72 object-contain bg-[#F6EFE0]"
                />
                <div className="px-4 py-3 border-t border-[#E5DBC4] bg-white flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[#C45A15] tabular-nums">
                    Đã nén: {previewUrl.length.toLocaleString('vi-VN')} / 260.000 ký tự
                  </span>
                  {!locked && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl('');
                          startCamera();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5DBC4] text-xs font-semibold text-[#231E18] hover:bg-[#FDF3D0] transition-colors whitespace-nowrap"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Chụp lại
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5DBC4] text-xs font-semibold text-[#231E18] hover:bg-[#FDF3D0] transition-colors whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Đổi ảnh
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FDF3D0] border border-[#E5DBC4] text-[#C45A15] flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="text-sm font-bold text-[#231E18]">
                    Chụp trang vở hoặc tải ảnh bài làm
                  </p>
                  <p className="text-xs text-[#6B6154] leading-relaxed">
                    Ảnh sẽ được nén tự động dưới 260.000 ký tự nhưng vẫn giữ độ nét chữ viết.
                  </p>
                </div>
                {!locked && (
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] transition-colors whitespace-nowrap"
                    >
                      <Camera className="w-4 h-4" />
                      Mở camera chụp bài
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5DBC4] bg-white text-[#231E18] text-sm font-semibold hover:bg-[#FDF3D0] transition-colors whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4" />
                      Chọn ảnh từ máy
                    </button>
                  </div>
                )}
                {cameraError && (
                  <p className="text-xs text-amber-900 bg-[#FDF3D0] border border-[#E5DBC4] rounded-xl px-3 py-2">
                    {cameraError}
                  </p>
                )}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <div>
            <label
              htmlFor="student-note-input"
              className="block text-xs font-bold text-[#231E18] mb-1.5"
            >
              Ghi chú gửi trợ lý
            </label>
            <textarea
              id="student-note-input"
              rows={2}
              disabled={locked}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Em còn phân vân câu 3b, nhờ thầy/cô kiểm tra giúp em..."
              className="w-full rounded-xl border border-[#E5DBC4] bg-white px-3.5 py-2.5 text-sm text-[#231E18] disabled:bg-[#F6EFE0] placeholder:text-[#968A7B] focus:outline-none focus:ring-2 focus:ring-[#C45A15]/25 focus:border-[#C45A15]"
            />
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              {errorMsg}
            </p>
          )}

          {!locked && (
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  stopCamera();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#6B6154] hover:bg-[#FDF3D0] transition-colors whitespace-nowrap"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={(!previewUrl && !note.trim()) || submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C45A15] text-white text-sm font-bold hover:bg-[#AA4C0F] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <Check className="w-4 h-4" />
                {submitting ? 'Đang nộp bài...' : 'Xác nhận nộp bài'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
