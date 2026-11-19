import { Mic, RotateCcw } from 'lucide-react';

const messageFor = (voiceExpense, isEnglish) => {
  if (voiceExpense?.status === 'listening') {
    return isEnglish ? 'Listening… Say the category, amount and account.' : 'Слушаю… Назови категорию, сумму и счёт.';
  }
  if (voiceExpense?.status === 'done') {
    return isEnglish
      ? `Recognized: “${voiceExpense.transcript}”. Check the fields below.`
      : `Распознано: «${voiceExpense.transcript}». Проверь поля ниже.`;
  }
  if (voiceExpense?.status === 'error') return voiceExpense.message;
  return isEnglish
    ? 'Say “Groceries 1,240 from Main card”. Speech stays on this device.'
    : 'Скажи: «Продукты 1 240 с основной карты». Голос остаётся на устройстве.';
};

export default function VoiceExpenseControl({ voiceExpense, startVoiceExpense, isEnglish }) {
  const status = voiceExpense?.status || 'idle';
  const isListening = status === 'listening';
  const isRetry = status === 'done' || status === 'error';
  const Icon = isRetry ? RotateCcw : Mic;

  return (
    <button
      type="button"
      onClick={startVoiceExpense}
      disabled={isListening}
      aria-label={
        isEnglish
          ? isRetry
            ? 'Try voice input again'
            : 'Enter expense by voice'
          : isRetry
            ? 'Повторить голосовой ввод'
            : 'Ввести расход голосом'
      }
      title={isEnglish ? 'Voice input' : 'Голосовой ввод'}
      className={`mc-voice-expense-button flex shrink-0 items-center justify-center transition-transform active:scale-95 disabled:cursor-wait ${
        isListening ? 'animate-pulse' : ''
      }`}
    >
      <Icon size={21} strokeWidth={2.1} aria-hidden="true" />
    </button>
  );
}

export function VoiceExpenseStatus({ voiceExpense, isEnglish }) {
  const status = voiceExpense?.status || 'idle';
  if (status === 'idle') return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className={`mc-voice-expense-status ${status === 'error' ? 'text-[var(--mc-negative)]' : ''}`}
    >
      {messageFor(voiceExpense, isEnglish)}
    </p>
  );
}
