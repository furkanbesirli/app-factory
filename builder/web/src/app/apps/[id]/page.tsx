"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "bg-yellow-900 text-yellow-300",
    running: "bg-blue-900 text-blue-300",
    success: "bg-green-900 text-green-300",
    failed: "bg-red-900 text-red-300",
    cancelled: "bg-gray-700 text-gray-300",
  };
  const labels: Record<string, string> = {
    queued: "Sırada",
    running: "Üretiliyor...",
    success: "Başarılı",
    failed: "Başarısız",
    cancelled: "İptal edildi",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded font-medium ${colors[status] || "bg-gray-700 text-gray-300"}`}>
      {labels[status] || status}
    </span>
  );
}

export default function AppDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [app, setApp] = useState<any>(null);
  const [builds, setBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Keystore form
  const [keystoreFile, setKeystoreFile] = useState<File | null>(null);
  const [storePassword, setStorePassword] = useState("");
  const [keyAlias, setKeyAlias] = useState("");
  const [keyPassword, setKeyPassword] = useState("");
  const [uploading, setUploading] = useState(false);

  // Logo form
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Branding edit
  const [editingBrand, setEditingBrand] = useState(false);
  const [brandForm, setBrandForm] = useState({
    appLabel: "",
    appSubtitle: "",
    loginBgColorStart: "#4C1D95",
    loginBgColorEnd: "#1E1B4B",
    brandPrimaryColor: "#7C3AED",
  });
  const [savingBrand, setSavingBrand] = useState(false);

  // OneSignal edit
  const [editingOneSignal, setEditingOneSignal] = useState(false);
  const [oneSignalForm, setOneSignalForm] = useState({ onesignalAppId: "", onesignalApiKey: "" });
  const [savingOneSignal, setSavingOneSignal] = useState(false);

  // Push form & history
  const [pushHistory, setPushHistory] = useState<any[]>([]);
  const [pushForm, setPushForm] = useState({
    title: "",
    message: "",
    image: "",
    url: "",
    schedule: "immediately" as "immediately" | "scheduled",
    scheduledDate: "",
    scheduledTime: "",
  });
  const [sendingPush, setSendingPush] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getApp(id), api.getBuilds(id)])
      .then(([a, b]) => {
        setApp(a);
        setBuilds(b);
        setBrandForm({
          appLabel: a.appLabel || "",
          appSubtitle: a.appSubtitle || "",
          loginBgColorStart: a.loginBgColorStart || "#4C1D95",
          loginBgColorEnd: a.loginBgColorEnd || "#1E1B4B",
          brandPrimaryColor: a.brandPrimaryColor || "#7C3AED",
        });
        setOneSignalForm({
          onesignalAppId: a.onesignalAppId || "",
          onesignalApiKey: a.onesignalApiKey || "",
        });
        if (a.onesignalAppId && a.onesignalApiKey) {
          api.getPushHistory(id).then(setPushHistory).catch(() => setPushHistory([]));
        } else {
          setPushHistory([]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const hasActive = builds.some((b) => b.status === "queued" || b.status === "running");
    if (!hasActive) return;
    const interval = setInterval(() => {
      api.getBuilds(id).then(setBuilds).catch(console.error);
    }, 3000);
    return () => clearInterval(interval);
  }, [builds, id]);

  const handleUploadKeystore = async () => {
    if (!keystoreFile || !storePassword || !keyAlias || !keyPassword) {
      alert("Tüm alanları doldurun");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", keystoreFile);
      fd.append("storePassword", storePassword);
      fd.append("keyAlias", keyAlias);
      fd.append("keyPassword", keyPassword);
      await api.uploadKeystore(id, fd);
      setKeystoreFile(null);
      setStorePassword("");
      setKeyAlias("");
      setKeyPassword("");
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", logoFile);
      await api.uploadLogo(app.applicationId, fd);
      setLogoFile(null);
      setLogoPreview(null);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoSelect = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const handleSaveBrand = async () => {
    setSavingBrand(true);
    try {
      await api.updateApp(id, brandForm);
      setEditingBrand(false);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingBrand(false);
    }
  };

  const handleSaveOneSignal = async () => {
    setSavingOneSignal(true);
    try {
      await api.updateApp(id, oneSignalForm);
      setEditingOneSignal(false);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingOneSignal(false);
    }
  };

  const handleSendPush = async () => {
    if (!pushForm.title.trim() || !pushForm.message.trim()) {
      alert("Başlık ve mesaj zorunludur.");
      return;
    }
    setSendingPush(true);
    try {
      let scheduledTimeStr: string | undefined;
      if (pushForm.schedule === "scheduled" && pushForm.scheduledDate && pushForm.scheduledTime) {
        scheduledTimeStr = `${pushForm.scheduledDate} ${pushForm.scheduledTime}:00 GMT+0300`;
      }
      const result = await api.sendPush({
        appIds: [id],
        title: pushForm.title.trim(),
        message: pushForm.message.trim(),
        image: pushForm.image.trim() || undefined,
        url: pushForm.url.trim() || undefined,
        schedule: pushForm.schedule,
        scheduledTime: scheduledTimeStr,
      });
      if (result.results?.[0]?.success) {
        setPushForm({ ...pushForm, title: "", message: "", image: "", url: "" });
        load();
      } else {
        alert(result.results?.[0]?.error || "Gönderim başarısız");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingPush(false);
    }
  };

  if (loading) return <p className="text-gray-400">Yükleniyor...</p>;
  if (!app) return <p className="text-red-400">Uygulama bulunamadı.</p>;

  const latestBuild = builds[0];
  const inputCls = "w-full bg-[#252525] border border-[#333] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/apps" className="text-gray-400 hover:text-white text-2xl">&larr;</Link>
        <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center overflow-hidden">
          {app.hasLogo ? (
            <img src={api.getLogoUrl(app.applicationId)} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">📱</span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-white">{app.displayName}</h2>
      </div>

      {/* App Info */}
      <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400">Paket Adı</p>
            <p className="text-white">{app.applicationId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Gizlilik Politikası</p>
            <p className="text-white">{app.policyName || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Analytics</p>
            <p className="text-white">
              {app.analyticsUrl ? <a href={app.analyticsUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Link</a> : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* OneSignal Section - Editable */}
      <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">OneSignal (Push Bildirim)</h3>
          <button
            onClick={() => setEditingOneSignal(!editingOneSignal)}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            {editingOneSignal ? "KAPAT" : "DÜZENLE"}
          </button>
        </div>
        {editingOneSignal ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">OneSignal App ID</label>
              <input value={oneSignalForm.onesignalAppId}
                onChange={(e) => setOneSignalForm({ ...oneSignalForm, onesignalAppId: e.target.value })}
                placeholder="542c753b-cf33-4271-9dd0-5c3577376c5f" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">OneSignal REST API Key</label>
              <input value={oneSignalForm.onesignalApiKey}
                onChange={(e) => setOneSignalForm({ ...oneSignalForm, onesignalApiKey: e.target.value })}
                placeholder="REST API Key (push göndermek için gerekli)" className={inputCls} />
            </div>
            <button onClick={handleSaveOneSignal} disabled={savingOneSignal}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-6 rounded text-sm font-medium">
              {savingOneSignal ? "Kaydediliyor..." : "KAYDET"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">OneSignal App ID</p>
              <p className="text-white font-mono text-sm">{app.onesignalAppId || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">OneSignal REST API Key</p>
              <p className="text-white font-mono text-sm">
                {app.onesignalApiKey ? `${app.onesignalApiKey.slice(0, 8)}...` : "-"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Push Form & History - only when OneSignal configured */}
      {app.onesignalAppId && app.onesignalApiKey && (
        <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Push Bildirim Gönder</h3>
            <Link href="/push" className="text-sm text-blue-400 hover:text-blue-300">
              Toplu gönder →
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Başlık *</label>
                <input value={pushForm.title} onChange={(e) => setPushForm({ ...pushForm, title: e.target.value })}
                  placeholder="Bildirim başlığı" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mesaj *</label>
                <textarea value={pushForm.message} onChange={(e) => setPushForm({ ...pushForm, message: e.target.value })}
                  placeholder="Bildirim mesajı" rows={2} className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Görsel URL</label>
                <input value={pushForm.image} onChange={(e) => setPushForm({ ...pushForm, image: e.target.value })}
                  placeholder="https://..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Açılacak URL</label>
                <input value={pushForm.url} onChange={(e) => setPushForm({ ...pushForm, url: e.target.value })}
                  placeholder="https://..." className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">Zamanlama</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="pushSchedule" checked={pushForm.schedule === "immediately"}
                      onChange={() => setPushForm({ ...pushForm, schedule: "immediately" })} className="w-4 h-4" />
                    <span className="text-sm text-white">Hemen</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="pushSchedule" checked={pushForm.schedule === "scheduled"}
                      onChange={() => setPushForm({ ...pushForm, schedule: "scheduled" })} className="w-4 h-4" />
                    <span className="text-sm text-white">Zamanla</span>
                  </label>
                </div>
                {pushForm.schedule === "scheduled" && (
                  <div className="flex gap-2 mt-2">
                    <input type="date" value={pushForm.scheduledDate}
                      onChange={(e) => setPushForm({ ...pushForm, scheduledDate: e.target.value })}
                      className="bg-[#252525] border border-[#333] rounded px-3 py-2 text-white text-sm" />
                    <input type="time" value={pushForm.scheduledTime}
                      onChange={(e) => setPushForm({ ...pushForm, scheduledTime: e.target.value })}
                      className="bg-[#252525] border border-[#333] rounded px-3 py-2 text-white text-sm" />
                  </div>
                )}
              </div>
              <button onClick={handleSendPush} disabled={sendingPush || !pushForm.title.trim() || !pushForm.message.trim()}
                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded">
                {sendingPush ? "Gönderiliyor..." : "GÖNDER"}
              </button>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-300 mb-3">Bildirim Geçmişi</h4>
              {pushHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">Henüz bildirim gönderilmedi.</p>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {pushHistory.map((h) => (
                    <div key={h._id} className={`rounded-lg p-3 text-sm ${h.success ? "bg-green-900/20 border border-green-800/50" : "bg-red-900/20 border border-red-800/50"}`}>
                      <p className="text-white font-medium truncate">{h.title}</p>
                      <p className="text-gray-400 text-xs truncate mt-0.5">{h.message}</p>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-gray-500">{new Date(h.sentAt).toLocaleString("tr-TR")}</span>
                        {h.success ? (
                          <span className="text-green-400">{h.recipients ?? 0} alıcı</span>
                        ) : (
                          <span className="text-red-400">{h.error || "Hata"}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Branding Section */}
      <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Marka & Görünüm</h3>
          <button
            onClick={() => setEditingBrand(!editingBrand)}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            {editingBrand ? "KAPAT" : "DÜZENLE"}
          </button>
        </div>

        {/* Preview */}
        <div className="rounded-lg overflow-hidden mb-4" style={{
          background: `linear-gradient(135deg, ${brandForm.loginBgColorStart}, ${brandForm.loginBgColorEnd})`,
          padding: '32px 24px',
        }}>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-lg mb-3">
              {app.hasLogo ? (
                <img src={api.getLogoUrl(app.applicationId)} alt="" className="w-12 h-12 object-contain" />
              ) : (
                <span className="text-3xl">📱</span>
              )}
            </div>
            <p className="text-white text-3xl font-black">
              {brandForm.appLabel || app.displayName}
            </p>
            <p className="text-sm mt-1" style={{ color: '#E0E7FF' }}>
              {brandForm.appSubtitle || "Connect. Chat. Spark."}
            </p>
            <div className="h-1 w-12 rounded mt-4" style={{ backgroundColor: brandForm.brandPrimaryColor }} />
          </div>
        </div>

        {editingBrand && (
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Uygulama Başlığı</label>
                <input value={brandForm.appLabel}
                  onChange={(e) => setBrandForm({ ...brandForm, appLabel: e.target.value })}
                  placeholder={app.displayName} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Alt Yazı</label>
                <input value={brandForm.appSubtitle}
                  onChange={(e) => setBrandForm({ ...brandForm, appSubtitle: e.target.value })}
                  placeholder="Connect. Chat. Spark." className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Arkaplan Başlangıç</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={brandForm.loginBgColorStart}
                    onChange={(e) => setBrandForm({ ...brandForm, loginBgColorStart: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-[#333] bg-transparent" />
                  <input value={brandForm.loginBgColorStart}
                    onChange={(e) => setBrandForm({ ...brandForm, loginBgColorStart: e.target.value })}
                    className="flex-1 bg-[#252525] border border-[#333] rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Arkaplan Bitiş</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={brandForm.loginBgColorEnd}
                    onChange={(e) => setBrandForm({ ...brandForm, loginBgColorEnd: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-[#333] bg-transparent" />
                  <input value={brandForm.loginBgColorEnd}
                    onChange={(e) => setBrandForm({ ...brandForm, loginBgColorEnd: e.target.value })}
                    className="flex-1 bg-[#252525] border border-[#333] rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Marka Rengi</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={brandForm.brandPrimaryColor}
                    onChange={(e) => setBrandForm({ ...brandForm, brandPrimaryColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-[#333] bg-transparent" />
                  <input value={brandForm.brandPrimaryColor}
                    onChange={(e) => setBrandForm({ ...brandForm, brandPrimaryColor: e.target.value })}
                    className="flex-1 bg-[#252525] border border-[#333] rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>

            <button onClick={handleSaveBrand} disabled={savingBrand}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-6 rounded text-sm font-medium">
              {savingBrand ? "Kaydediliyor..." : "KAYDET"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Logo Section */}
        <div className="bg-[#1e1e1e] rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Logo</h3>
          {app.hasLogo && (
            <div className="bg-[#252525] rounded-lg p-4 mb-4 flex justify-center">
              <img src={api.getLogoUrl(app.applicationId)} alt="Logo" className="h-20 w-20 object-contain" />
            </div>
          )}
          <div className="space-y-3">
            <p className="text-xs text-gray-500">PNG, kare 512×512 px. Logo ortada, kenarlarda boşluk bırak — ana ekranda zoom olmadan tam görünür.</p>
            {logoPreview && (
              <div className="bg-[#252525] rounded-lg p-3 flex justify-center">
                <img src={logoPreview} alt="Preview" className="h-16 w-16 object-contain" />
              </div>
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp"
              onChange={(e) => handleLogoSelect(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer" />
            <button onClick={handleUploadLogo} disabled={!logoFile || uploadingLogo}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded text-sm font-medium">
              {uploadingLogo ? "Yükleniyor..." : "LOGO YÜKLE"}
            </button>
          </div>
        </div>

        {/* Keystore Section */}
        <div className="bg-[#1e1e1e] rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Keystore</h3>
          {app.keystore?.originalFileName ? (
            <div className="bg-green-900/20 border border-green-800 rounded p-3 mb-4">
              <p className="text-green-300 text-sm">Yüklü: {app.keystore.originalFileName}</p>
            </div>
          ) : (
            <div className="bg-orange-900/20 border border-orange-800 rounded p-3 mb-4">
              <p className="text-orange-300 text-sm">Henüz keystore yüklenmedi</p>
            </div>
          )}
          <div className="space-y-3">
            <input type="file" accept=".jks,.keystore,application/x-java-keystore,application/octet-stream"
              onChange={(e) => setKeystoreFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer" />
            <input placeholder="Store Password" type="password" value={storePassword}
              onChange={(e) => setStorePassword(e.target.value)} className={inputCls} />
            <input placeholder="Key Alias" value={keyAlias}
              onChange={(e) => setKeyAlias(e.target.value)} className={inputCls} />
            <input placeholder="Key Password" type="password" value={keyPassword}
              onChange={(e) => setKeyPassword(e.target.value)} className={inputCls} />
            <button onClick={handleUploadKeystore} disabled={uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded text-sm font-medium">
              {uploading ? "Yükleniyor..." : "KEY YÜKLE"}
            </button>
          </div>
        </div>

        {/* Quick Build */}
        <div className="bg-[#1e1e1e] rounded-lg p-6 flex flex-col justify-center items-center">
          <h3 className="text-lg font-bold text-white mb-3">Yeni Versiyon Üret</h3>
          <Link
            href={`/apps/${id}/build`}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded text-lg transition-colors"
          >
            ÜRET
          </Link>
          {latestBuild && (
            <p className="text-sm text-gray-400 mt-2">
              Son versiyon: v{latestBuild.versionName} ({latestBuild.versionCode})
            </p>
          )}
        </div>
      </div>

      {/* Build History */}
      <div className="bg-[#1e1e1e] rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Build Geçmişi</h3>
        {builds.length === 0 ? (
          <p className="text-gray-400">Henüz build yok.</p>
        ) : (
          <div className="space-y-3">
            {builds.map((b) => (
              <div key={b._id} className="bg-[#252525] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">v{b.versionName}</span>
                    <span className="text-gray-400 text-sm">({b.versionCode})</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(b.requestedAt).toLocaleString("tr-TR")}
                  </span>
                </div>

                {/* Build ayarları */}
                {b.paramsSnapshot && (
                  <div className="mt-2 p-3 bg-[#1a1a1a] rounded text-xs text-gray-400 space-y-1">
                    <p className="text-gray-500 font-medium mb-1.5">Bu build ile oluşturuldu:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                      <span>App adı TR: {(b.paramsSnapshot as any).appNameTR || "-"}</span>
                      <span>App adı EN: {(b.paramsSnapshot as any).appNameEN || "-"}</span>
                      <span>App adı ES: {(b.paramsSnapshot as any).appNameES || "-"}</span>
                    </div>
                    {(b.paramsSnapshot as any).diversify && (
                      <div className="mt-2 pt-2 border-t border-[#333]">
                        <p className="text-gray-500 font-medium mb-1">Klon Koruma:</p>
                        <div className="flex flex-wrap gap-2">
                          {(b.paramsSnapshot as any).diversify.enabled ? (
                            <>
                              <span className="bg-[#333] px-2 py-0.5 rounded">R8: {(b.paramsSnapshot as any).diversify.proguardEnabled ? "✓" : "✗"}</span>
                              <span className="bg-[#333] px-2 py-0.5 rounded">Class: {(b.paramsSnapshot as any).diversify.classCount || 8}</span>
                              <span className="bg-[#333] px-2 py-0.5 rounded">Asset: {(b.paramsSnapshot as any).diversify.dummyAssetSizeMb || 0}MB</span>
                              <span className="bg-[#333] px-2 py-0.5 rounded">Resource: {(b.paramsSnapshot as any).diversify.resourceNoise ? "✓" : "✗"}</span>
                              <span className="bg-[#333] px-2 py-0.5 rounded">Layout: {(b.paramsSnapshot as any).diversify.layoutNoise ? "✓" : "✗"}</span>
                              <span className="bg-[#333] px-2 py-0.5 rounded">Obfuscation: {(b.paramsSnapshot as any).diversify.obfuscationDict ? "✓" : "✗"}</span>
                            </>
                          ) : (
                            <span className="bg-[#333] px-2 py-0.5 rounded">Kapalı</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {b.status === "success" && b.outputs && (
                  <div className="flex gap-2 mt-2">
                    {b.outputs.apkPath && (
                      <a href={`/api/download?path=${encodeURIComponent(b.outputs.apkPath)}`}
                        className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1">
                        APK
                      </a>
                    )}
                    {b.outputs.aabPath && (
                      <a href={`/api/download?path=${encodeURIComponent(b.outputs.aabPath)}`}
                        className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1">
                        AAB
                      </a>
                    )}
                    {b.logsPath && (
                      <a href={`/api/download?path=${encodeURIComponent(b.logsPath)}`}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1">
                        Log
                      </a>
                    )}
                  </div>
                )}
                {b.status === "failed" && (
                  <div className="mt-2">
                    <p className="text-red-400 text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {b.errorMessage?.slice(0, 500)}
                    </p>
                    {b.logsPath && (
                      <a href={`/api/download?path=${encodeURIComponent(b.logsPath)}`}
                        className="text-blue-400 text-xs hover:underline mt-1 inline-block">
                        Tam log dosyasını indir
                      </a>
                    )}
                  </div>
                )}
                {(b.status === "queued" || b.status === "running") && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      <span className="text-sm text-blue-300">
                        {b.status === "queued" ? "Sırada bekliyor..." : "Üretiliyor..."}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm("Bu build iptal edilsin mi?")) return;
                        try {
                          await api.cancelBuild(b._id);
                          load();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 text-xs font-medium"
                    >
                      İPTAL
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
