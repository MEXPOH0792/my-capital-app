import { useState } from 'react';
import { MetricCard, SectionCard, SectionHeader, StoragePlacementCard } from '../../ui/AppUi.jsx';

export default function StorageSetupPanel({
  theme,
  store,
  text,
  softPanelStyle,
  fmt,
  storageLabels,
  storageForm,
  handleStorageInput,
  previewStorageItems,
  saveStorageSettings,
  isEnglish,
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <SectionCard theme={theme} className="space-y-2 p-3" tone="utility">
      <SectionHeader eyebrow={storageLabels.title} compact />

      <div className="space-y-2">
        <p className="px-1 text-[10px] font-semibold opacity-55">{storageLabels.liquidSplit}</p>
        <input
          type="text"
          value={storageForm.liquidPrimaryName}
          onChange={(e) => handleStorageInput('liquidPrimaryName', e.target.value)}
          placeholder={storageLabels.primaryFallback}
          className="w-full rounded-[16px] border px-3.5 py-2 text-[13px] font-bold outline-none"
          style={softPanelStyle}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard label={storageLabels.splitTotal} value="100%" theme={theme} compact />
        <MetricCard label={text.accounts} value={store.accounts.length} theme={theme} compact />
      </div>

      <div className="space-y-2">
        <p className="px-1 text-[10px] font-semibold opacity-55">{storageLabels.dedicatedPlaces}</p>
        <input
          type="text"
          value={storageForm.safetyName}
          onChange={(e) => handleStorageInput('safetyName', e.target.value)}
          placeholder={storageLabels.safetyFallback}
          className="w-full rounded-[16px] border px-3.5 py-2 text-[13px] font-bold outline-none"
          style={softPanelStyle}
        />
        <input
          type="text"
          value={storageForm.capitalName}
          onChange={(e) => handleStorageInput('capitalName', e.target.value)}
          placeholder={storageLabels.capitalFallback}
          className="w-full rounded-[16px] border px-3.5 py-2 text-[13px] font-bold outline-none"
          style={softPanelStyle}
        />
        <input
          type="text"
          value={storageForm.sadakaName}
          onChange={(e) => handleStorageInput('sadakaName', e.target.value)}
          placeholder={storageLabels.sadakaFallback}
          className="w-full rounded-[16px] border px-3.5 py-2 text-[13px] font-bold outline-none"
          style={softPanelStyle}
        />
        <p className="px-1 text-[10px] leading-[1.3] opacity-55">{storageLabels.sadakaHint}</p>
      </div>

      <div className="rounded-[16px] border px-3 py-2" style={softPanelStyle}>
        <button
          type="button"
          onClick={() => setShowPreview((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="text-[10px] font-semibold opacity-55">{storageLabels.previewTitle}</span>
          <span className="text-[10px] font-semibold opacity-55">
            {showPreview ? (isEnglish ? 'Hide' : 'Скрыть') : isEnglish ? 'Show' : 'Показать'}
          </span>
        </button>
        {showPreview ? (
          <div className="mt-2">
            <StoragePlacementCard title="" note="" items={previewStorageItems} theme={theme} fmt={fmt} compact />
          </div>
        ) : null}
      </div>

      <button
        onClick={saveStorageSettings}
        className="w-full rounded-[16px] bg-emerald-600 py-2 text-[10px] font-semibold text-white"
      >
        {storageLabels.save}
      </button>
    </SectionCard>
  );
}
