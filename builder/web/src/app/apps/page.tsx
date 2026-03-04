"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function AppsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    templateId: "",
    displayName: "",
    applicationId: "",
    policyName: "",
    onesignalAppId: "",
    onesignalApiKey: "",
    analyticsUrl: "",
    appLabel: "",
    appSubtitle: "",
    loginBgColorStart: "#4C1D95",
    loginBgColorEnd: "#1E1B4B",
    brandPrimaryColor: "#7C3AED",
  });

  const load = () => {
    setLoading(true);
    Promise.all([api.getApps(), api.getTemplates()])
      .then(([a, t]) => { setApps(a); setTemplates(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.displayName || !form.applicationId || !form.templateId) return;
    try {
      await api.createApp(form);
      setForm({
        templateId: "", displayName: "", applicationId: "", policyName: "",
        onesignalAppId: "", onesignalApiKey: "", analyticsUrl: "", appLabel: "", appSubtitle: "",
        loginBgColorStart: "#4C1D95", loginBgColorEnd: "#1E1B4B", brandPrimaryColor: "#7C3AED",
      });
      setShowCreate(false);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const inputCls = "w-full bg-[#252525] border border-[#333] rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">UYGULAMALAR</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          YENİ UYGULAMA +
        </button>
      </div>

      {showCreate && (
        <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Yeni Uygulama</h3>

          <select
            value={form.templateId}
            onChange={(e) => setForm({ ...form, templateId: e.target.value })}
            className={inputCls}
          >
            <option value="">Taslak Seçin</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>

          <input placeholder="Gözüken İsim" value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })} className={inputCls} />
          <input placeholder="Paket Adı (ör: com.example.app)" value={form.applicationId}
            onChange={(e) => setForm({ ...form, applicationId: e.target.value })} className={inputCls} />
          <input placeholder="Gizlilik Politikası Adı" value={form.policyName}
            onChange={(e) => setForm({ ...form, policyName: e.target.value })} className={inputCls} />

          <div className="border-t border-[#333] pt-4">
            <h4 className="text-sm font-bold text-gray-300 mb-3">ONESIGNAL (isteğe bağlı)</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">OneSignal App ID</label>
                <input placeholder="542c753b-cf33-4271-9dd0-5c3577376c5f" value={form.onesignalAppId}
                  onChange={(e) => setForm({ ...form, onesignalAppId: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">OneSignal REST API Key</label>
                <input placeholder="REST API Key (push göndermek için gerekli)" value={form.onesignalApiKey}
                  onChange={(e) => setForm({ ...form, onesignalApiKey: e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Analytics URL (isteğe bağlı)</label>
            <input placeholder="https://..." value={form.analyticsUrl}
              onChange={(e) => setForm({ ...form, analyticsUrl: e.target.value })} className={inputCls} />
          </div>

          <div className="border-t border-[#333] pt-4 mt-4">
            <h4 className="text-sm font-bold text-gray-300 mb-3">UYGULAMA MARKASI</h4>

            <input placeholder='Uygulama Başlığı (ör: "MiniTV")' value={form.appLabel}
              onChange={(e) => setForm({ ...form, appLabel: e.target.value })} className={inputCls} />
            <input placeholder='Alt Yazı (ör: "Connect. Chat. Spark.")' value={form.appSubtitle}
              onChange={(e) => setForm({ ...form, appSubtitle: e.target.value })} className={`${inputCls} mt-3`} />

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Arkaplan Başlangıç</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.loginBgColorStart}
                    onChange={(e) => setForm({ ...form, loginBgColorStart: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border border-[#333] bg-transparent" />
                  <input value={form.loginBgColorStart}
                    onChange={(e) => setForm({ ...form, loginBgColorStart: e.target.value })}
                    className="flex-1 bg-[#252525] border border-[#333] rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Arkaplan Bitiş</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.loginBgColorEnd}
                    onChange={(e) => setForm({ ...form, loginBgColorEnd: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border border-[#333] bg-transparent" />
                  <input value={form.loginBgColorEnd}
                    onChange={(e) => setForm({ ...form, loginBgColorEnd: e.target.value })}
                    className="flex-1 bg-[#252525] border border-[#333] rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Marka Rengi</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.brandPrimaryColor}
                    onChange={(e) => setForm({ ...form, brandPrimaryColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border border-[#333] bg-transparent" />
                  <input value={form.brandPrimaryColor}
                    onChange={(e) => setForm({ ...form, brandPrimaryColor: e.target.value })}
                    className="flex-1 bg-[#252525] border border-[#333] rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 rounded-lg overflow-hidden" style={{
              background: `linear-gradient(135deg, ${form.loginBgColorStart}, ${form.loginBgColorEnd})`,
              padding: '24px',
            }}>
              <p className="text-center text-white text-2xl font-black">{form.appLabel || form.displayName || "App Label"}</p>
              <p className="text-center text-sm mt-1" style={{ color: '#E0E7FF' }}>
                {form.appSubtitle || "Connect. Chat. Spark."}
              </p>
              <div className="flex justify-center mt-3">
                <div className="h-1 w-12 rounded" style={{ backgroundColor: form.brandPrimaryColor }} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm font-medium">
              OLUŞTUR
            </button>
            <button onClick={() => setShowCreate(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded text-sm font-medium">
              KAPAT
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Yükleniyor...</p>
      ) : apps.length === 0 ? (
        <p className="text-gray-400">Henüz uygulama yok. Yeni bir uygulama oluşturun.</p>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <Link
              key={a._id}
              href={`/apps/${a._id}`}
              className="block bg-[#1e1e1e] rounded-lg p-4 hover:bg-[#252525] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#333] rounded-lg flex items-center justify-center overflow-hidden">
                  {a.hasLogo ? (
                    <img src={api.getLogoUrl(a.applicationId)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">📱</span>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold">{a.displayName}</h3>
                  <p className="text-sm text-gray-400">{a.applicationId}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {a.hasLogo && (
                    <span className="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded">Logo</span>
                  )}
                  {a.keystore?.originalFileName ? (
                    <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">Key Yüklü</span>
                  ) : (
                    <span className="text-xs bg-orange-900 text-orange-300 px-2 py-1 rounded">Key Gerekli</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
