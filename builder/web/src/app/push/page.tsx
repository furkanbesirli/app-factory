"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function PushPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [allApps, setAllApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<any>(null);

  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState("");
  const [url, setUrl] = useState("");
  const [schedule, setSchedule] = useState<"immediately" | "scheduled">("immediately");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  useEffect(() => {
    Promise.all([api.getPushApps(), api.getApps()])
      .then(([pushApps, all]) => {
        setApps(pushApps);
        setAllApps(all);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleApp = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAppIds.length === apps.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(apps.map((a) => a._id));
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      alert("Başlık ve mesaj zorunludur.");
      return;
    }
    if (!sendToAll && selectedAppIds.length === 0) {
      alert("En az bir uygulama seçin veya 'Tümüne Gönder' aktif edin.");
      return;
    }

    setSending(true);
    setResults(null);
    try {
      let scheduledTimeStr: string | undefined;
      if (schedule === "scheduled" && scheduledDate && scheduledTime) {
        scheduledTimeStr = `${scheduledDate} ${scheduledTime}:00 GMT+0300`;
      }

      const result = await api.sendPush({
        appIds: sendToAll ? undefined : selectedAppIds,
        sendToAll,
        title: title.trim(),
        message: message.trim(),
        image: image.trim() || undefined,
        url: url.trim() || undefined,
        schedule,
        scheduledTime: scheduledTimeStr,
      });
      setResults(result);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    "w-full bg-[#252525] border border-[#333] rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 placeholder-gray-500";

  const appsWithoutPush = allApps.filter(
    (a) => !apps.some((p) => p._id === a._id)
  );

  if (loading) return <p className="text-gray-400 p-6">Yükleniyor...</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">PUSH BİLDİRİM</h2>

      {/* Results */}
      {results && (
        <div className={`rounded-lg p-4 mb-6 ${results.failed > 0 ? "bg-yellow-900/20 border border-yellow-800" : "bg-green-900/20 border border-green-800"}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{results.failed === 0 ? "✓" : "⚠"}</span>
            <div>
              <p className="text-white font-bold">
                {results.sent}/{results.total} uygulamaya gönderildi
              </p>
              {results.failed > 0 && (
                <p className="text-yellow-300 text-sm">{results.failed} başarısız</p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            {results.results.map((r: any) => (
              <div key={r.appId} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{r.displayName}</span>
                {r.success ? (
                  <span className="text-green-400">Gönderildi ({r.recipients} alıcı)</span>
                ) : (
                  <span className="text-red-400">{r.error}</span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setResults(null)}
            className="mt-3 text-sm text-gray-400 hover:text-white"
          >
            Kapat
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: App Selection */}
        <div className="lg:col-span-2">
          <div className="bg-[#1e1e1e] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Uygulamalar</h3>
              <span className="text-xs text-gray-500">{apps.length} aktif</span>
            </div>

            {/* Send to all toggle */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#333]">
              <span className="text-sm text-gray-300">Tümüne Gönder</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendToAll}
                  onChange={(e) => setSendToAll(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#333] rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>

            {!sendToAll && (
              <>
                {apps.length > 1 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-blue-400 hover:text-blue-300 mb-3"
                  >
                    {selectedAppIds.length === apps.length ? "Tümünü Kaldır" : "Tümünü Seç"}
                  </button>
                )}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {apps.map((a) => (
                    <label
                      key={a._id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedAppIds.includes(a._id)
                          ? "bg-blue-900/30 border border-blue-700"
                          : "bg-[#252525] border border-transparent hover:border-[#444]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAppIds.includes(a._id)}
                        onChange={() => toggleApp(a._id)}
                        className="w-4 h-4 rounded bg-[#333] border-[#555] text-blue-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{a.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{a.applicationId}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {appsWithoutPush.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#333]">
                <p className="text-xs text-gray-500 mb-2">
                  OneSignal bilgisi eksik ({appsWithoutPush.length}):
                </p>
                <div className="space-y-1">
                  {appsWithoutPush.map((a) => (
                    <p key={a._id} className="text-xs text-gray-600 truncate">
                      {a.displayName}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Push Form */}
        <div className="lg:col-span-3 space-y-4">
          {/* Title */}
          <div className="bg-[#1e1e1e] rounded-lg p-5">
            <label className="block text-xs text-gray-400 mb-2 font-medium">BAŞLIK *</label>
            <input
              placeholder="Bildirim başlığı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Message */}
          <div className="bg-[#1e1e1e] rounded-lg p-5">
            <label className="block text-xs text-gray-400 mb-2 font-medium">MESAJ *</label>
            <textarea
              placeholder="Bildirim mesajı"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Image */}
          <div className="bg-[#1e1e1e] rounded-lg p-5">
            <label className="block text-xs text-gray-400 mb-2 font-medium">GÖRSEL URL (isteğe bağlı)</label>
            <input
              placeholder="https://example.com/image.jpg"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className={inputCls}
            />
            {image && (
              <div className="mt-3 bg-[#252525] rounded p-2 flex justify-center">
                <img
                  src={image}
                  alt="Preview"
                  className="max-h-32 rounded"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>

          {/* Launch URL */}
          <div className="bg-[#1e1e1e] rounded-lg p-5">
            <label className="block text-xs text-gray-400 mb-2 font-medium">AÇILACAK URL (isteğe bağlı)</label>
            <input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Schedule */}
          <div className="bg-[#1e1e1e] rounded-lg p-5">
            <label className="block text-xs text-gray-400 mb-3 font-medium">ZAMANLAMA</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  checked={schedule === "immediately"}
                  onChange={() => setSchedule("immediately")}
                  className="w-4 h-4 text-blue-600 bg-[#333] border-[#555] focus:ring-0"
                />
                <span className="text-white text-sm">Hemen Gönder</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="schedule"
                  checked={schedule === "scheduled"}
                  onChange={() => setSchedule("scheduled")}
                  className="w-4 h-4 text-blue-600 bg-[#333] border-[#555] focus:ring-0"
                />
                <span className="text-white text-sm">Belirli Zamanda</span>
              </label>

              {schedule === "scheduled" && (
                <div className="flex gap-3 ml-7">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-[#252525] border border-[#333] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="bg-[#252525] border border-[#333] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-[#1e1e1e] rounded-lg p-5">
            <label className="block text-xs text-gray-400 mb-3 font-medium">ÖN İZLEME</label>
            <div className="bg-[#252525] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">🔔</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">
                    {title || "Bildirim Başlığı"}
                  </p>
                  <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">
                    {message || "Bildirim mesajı burada görünecek."}
                  </p>
                  {image && (
                    <div className="mt-2 rounded overflow-hidden">
                      <img
                        src={image}
                        alt=""
                        className="w-full h-32 object-cover rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || (!sendToAll && selectedAppIds.length === 0) || !title.trim() || !message.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg text-lg transition-colors"
          >
            {sending
              ? "Gönderiliyor..."
              : sendToAll
                ? `TÜMÜNE GÖNDER (${apps.length} uygulama)`
                : `GÖNDER (${selectedAppIds.length} uygulama)`}
          </button>
        </div>
      </div>
    </div>
  );
}
