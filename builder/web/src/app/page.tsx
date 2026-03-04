"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function BuildPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedApp, setSelectedApp] = useState("");

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(console.error);
    api.getApps().then(setApps).catch(console.error);
  }, []);

  const handleContinue = () => {
    if (!selectedTemplate || !selectedApp) return;
    router.push(`/apps/${selectedApp}/build?template=${selectedTemplate}`);
  };

  return (
    <div className="max-w-xl mx-auto mt-16">
      <h2 className="text-2xl font-bold mb-8 text-white">ÜRET</h2>

      <div className="bg-[#1e1e1e] rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Taslak</label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full bg-[#252525] border border-[#333] rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Taslak Seçin</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Uygulama</label>
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="w-full bg-[#252525] border border-[#333] rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Uygulama Seçin</option>
            {apps.map((a) => (
              <option key={a._id} value={a._id}>
                {a.displayName} ({a.applicationId})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedTemplate || !selectedApp}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded transition-colors"
        >
          DEVAM ET →
        </button>
      </div>
    </div>
  );
}
