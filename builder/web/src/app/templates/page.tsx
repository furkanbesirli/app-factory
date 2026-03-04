"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", localPath: "./android", description: "" });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getTemplates().then(setTemplates).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name) return;
    try {
      await api.createTemplate({
        ...form,
        parameters: [
          { key: "APP_VERSION", label: "Versiyon Kodu", type: "number", required: true, defaultValue: 100 },
          { key: "APP_NAME_TR", label: "Uygulama Adı (TR)", type: "string", required: false },
          { key: "APP_NAME_EN", label: "Uygulama Adı (EN)", type: "string", required: false },
          { key: "APP_NAME_ES", label: "Uygulama Adı (ES)", type: "string", required: false },
          { key: "APP_ONESIGNAL_ID", label: "OneSignal ID", type: "string", required: false },
        ],
        patchRules: [],
      });
      setForm({ name: "", localPath: "./android", description: "" });
      setShowCreate(false);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu taslağı silmek istediğinize emin misiniz?")) return;
    try {
      await api.deleteTemplate(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">TASLAKLAR</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
        >
          YENİ TASLAK +
        </button>
      </div>

      {showCreate && (
        <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Yeni Taslak</h3>
          <input
            placeholder="Taslak Adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-[#252525] border border-[#333] rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          />
          <input
            placeholder="Yerel Yol (ör: ./android)"
            value={form.localPath}
            onChange={(e) => setForm({ ...form, localPath: e.target.value })}
            className="w-full bg-[#252525] border border-[#333] rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          />
          <input
            placeholder="Açıklama"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-[#252525] border border-[#333] rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded text-sm font-medium">
              OLUŞTUR
            </button>
            <button onClick={() => setShowCreate(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded text-sm font-medium">
              İPTAL
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Yükleniyor...</p>
      ) : templates.length === 0 ? (
        <p className="text-gray-400">Henüz taslak yok. Yeni bir taslak oluşturun.</p>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t._id} className="bg-[#1e1e1e] rounded-lg p-4 flex items-center justify-between hover:bg-[#252525] transition-colors">
              <div>
                <h3 className="text-white font-bold">{t.name}</h3>
                <p className="text-sm text-gray-400">{t.localPath}</p>
                {t.description && <p className="text-sm text-gray-500 mt-1">{t.description}</p>}
              </div>
              <button
                onClick={() => handleDelete(t._id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
