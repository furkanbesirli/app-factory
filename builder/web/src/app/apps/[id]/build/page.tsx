"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function BuildFormPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [app, setApp] = useState<any>(null);
  const [builds, setBuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    versionCode: 100,
    versionName: "1.0.0",
    appNameTR: "",
    appNameEN: "",
    appNameES: "",
    onesignalAppId: "",
  });

  const [diversify, setDiversify] = useState({
    enabled: true,
    classCount: 8,
    resourceNoise: true,
    dummyAssets: true,
    dummyAssetSizeMb: 2,
    layoutNoise: true,
    obfuscationDict: true,
    proguardEnabled: true,
  });

  useEffect(() => {
    Promise.all([api.getApp(appId), api.getBuilds(appId)])
      .then(([a, b]) => {
        setApp(a);
        setBuilds(b);
        const latest = b[0];
        const nextCode = latest ? latest.versionCode + 1 : 100;
        const parts = latest?.versionName?.split(".") || ["1", "0", "0"];
        const patch = parseInt(parts[2] || "0") + 1;
        const nextName = latest ? `${parts[0]}.${parts[1]}.${patch}` : "1.0.0";

        setForm({
          versionCode: nextCode,
          versionName: nextName,
          appNameTR: (latest?.paramsSnapshot?.appNameTR as string) || a.displayName,
          appNameEN: (latest?.paramsSnapshot?.appNameEN as string) || a.displayName,
          appNameES: (latest?.paramsSnapshot?.appNameES as string) || a.displayName,
          onesignalAppId: a.onesignalAppId || "",
        });

        if (latest?.paramsSnapshot?.diversify) {
          setDiversify({ ...diversify, ...latest.paramsSnapshot.diversify });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [appId]);

  const handleSubmit = async () => {
    if (!form.versionCode || !form.versionName) return;
    setSubmitting(true);
    try {
      await api.createBuild(appId, { ...form, diversify });
      router.push(`/apps/${appId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-gray-400">Yükleniyor...</p>;
  if (!app) return <p className="text-red-400">Uygulama bulunamadı.</p>;

  const templateName = typeof app.templateId === "object" ? app.templateId.name : "Template";
  const inputCls = "w-full bg-[#252525] border border-[#333] rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500";

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-[#333] rounded-lg flex items-center justify-center text-3xl">
              {app.hasLogo ? (
                <img src={api.getLogoUrl(app.applicationId)} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : "📱"}
            </div>
            <div>
              <p className="text-sm text-gray-400">Uygulama</p>
              <h3 className="text-white font-bold">{app.displayName} v{form.versionName}</h3>
              <p className="text-xs text-gray-500">{app.applicationId}</p>
              <p className="text-xs text-gray-500">{templateName}</p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded transition-colors"
          >
            {submitting ? "Üretiliyor..." : `V${form.versionName} ÜRET`}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-[#1e1e1e] rounded-lg p-4">
          <label className="block text-xs text-gray-400 mb-1">UYGULAMANIN VERSİYONU</label>
          <input type="number" value={form.versionCode}
            onChange={(e) => setForm({ ...form, versionCode: parseInt(e.target.value) || 0 })}
            className={inputCls} />
        </div>

        <div className="bg-[#1e1e1e] rounded-lg p-4">
          <label className="block text-xs text-gray-400 mb-1">VERSİYON ADI</label>
          <input value={form.versionName}
            onChange={(e) => setForm({ ...form, versionName: e.target.value })}
            className={inputCls} />
        </div>

        <div className="bg-[#1e1e1e] rounded-lg p-4">
          <label className="block text-xs text-gray-400 mb-1">Uygulama Adı (TR)</label>
          <input value={form.appNameTR}
            onChange={(e) => setForm({ ...form, appNameTR: e.target.value })}
            className={inputCls} />
        </div>

        <div className="bg-[#1e1e1e] rounded-lg p-4">
          <label className="block text-xs text-gray-400 mb-1">Uygulama Adı (EN)</label>
          <input value={form.appNameEN}
            onChange={(e) => setForm({ ...form, appNameEN: e.target.value })}
            className={inputCls} />
        </div>

        <div className="bg-[#1e1e1e] rounded-lg p-4">
          <label className="block text-xs text-gray-400 mb-1">Uygulama Adı (ES)</label>
          <input value={form.appNameES}
            onChange={(e) => setForm({ ...form, appNameES: e.target.value })}
            className={inputCls} />
        </div>

        <div className="bg-[#1e1e1e] rounded-lg p-4">
          <label className="block text-xs text-gray-400 mb-1">ONESIGNAL ID</label>
          <input value={form.onesignalAppId}
            onChange={(e) => setForm({ ...form, onesignalAppId: e.target.value })}
            className={inputCls} />
        </div>

        {/* Diversification Panel */}
        <div className="bg-[#1e1e1e] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold">Klon Koruma (Diversification)</h3>
              <p className="text-xs text-gray-500 mt-1">Her build benzersiz binary fingerprint üretir</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={diversify.enabled}
                onChange={(e) => setDiversify({ ...diversify, enabled: e.target.checked })}
                className="sr-only peer" />
              <div className="w-11 h-6 bg-[#333] rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>

          {diversify.enabled && (
            <div className="space-y-3 border-t border-[#333] pt-4">
              {/* Code Injection */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Kod Enjeksiyonu</p>
                  <p className="text-xs text-gray-500">Random Kotlin class&apos;ları eklenir</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={30} value={diversify.classCount}
                    onChange={(e) => setDiversify({ ...diversify, classCount: parseInt(e.target.value) || 8 })}
                    className="w-16 bg-[#252525] border border-[#333] rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-blue-500" />
                  <span className="text-xs text-gray-500">class</span>
                </div>
              </div>

              {/* Resource Noise */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Resource Gürültüsü</p>
                  <p className="text-xs text-gray-500">Random dimen, color, string entry&apos;leri</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={diversify.resourceNoise}
                    onChange={(e) => setDiversify({ ...diversify, resourceNoise: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-[#333] rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>

              {/* Layout Noise */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Layout Gürültüsü</p>
                  <p className="text-xs text-gray-500">Görünmez dummy view&apos;lar eklenir</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={diversify.layoutNoise}
                    onChange={(e) => setDiversify({ ...diversify, layoutNoise: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-[#333] rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>

              {/* Dummy Assets */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Boyut Farklılaştırma</p>
                  <p className="text-xs text-gray-500">Random binary dosyalar ile MB farkı</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={diversify.dummyAssets}
                      onChange={(e) => setDiversify({ ...diversify, dummyAssets: e.target.checked })}
                      className="sr-only peer" />
                    <div className="w-9 h-5 bg-[#333] rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                  {diversify.dummyAssets && (
                    <div className="flex items-center gap-1">
                      <input type="number" min={1} max={20} value={diversify.dummyAssetSizeMb}
                        onChange={(e) => setDiversify({ ...diversify, dummyAssetSizeMb: parseInt(e.target.value) || 2 })}
                        className="w-14 bg-[#252525] border border-[#333] rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-blue-500" />
                      <span className="text-xs text-gray-500">MB</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Obfuscation Dictionary */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">Obfuscation Dictionary</p>
                  <p className="text-xs text-gray-500">Her build&apos;de farklı R8 sözlüğü</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={diversify.obfuscationDict}
                    onChange={(e) => setDiversify({ ...diversify, obfuscationDict: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-[#333] rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>

              {/* Proguard/R8 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">R8 / Proguard</p>
                  <p className="text-xs text-gray-500">Kod küçültme ve karıştırma</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={diversify.proguardEnabled}
                    onChange={(e) => setDiversify({ ...diversify, proguardEnabled: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-9 h-5 bg-[#333] rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                </label>
              </div>

              {/* Info Box */}
              <div className="bg-[#252525] rounded p-3 mt-3 space-y-2">
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-yellow-400 font-bold">Ne yapar?</span> Her build&apos;de benzersiz bytecode, resource hash, layout yapısı ve dosya boyutu oluşturur. 
                  Play Store&apos;un clone detection sistemini atlatmak için kod seviyesinde farklılaşma sağlar. 
                  R8 aktifken class/method isimleri her build&apos;de farklı obfuscation dictionary ile karıştırılır.
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-green-400 font-bold">Boyut örneği:</span> R8 kapalı (~16MB) + 10MB asset ≈ 26MB APK. 
                  R8 açık (~5MB) + 2MB asset ≈ 7MB. İstediğin kombinasyonu seçebilirsin.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
