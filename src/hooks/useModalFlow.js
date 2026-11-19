import { useEffect, useRef, useState } from 'react';
import { getActiveCategoryPresets } from '../domain/finance.js';
import { measurePerf } from '../utils/perfMarks.js';
import { OnDeviceSpeechError, startOnDeviceSpeech } from '../utils/onDeviceSpeech.ts';
import { parseVoiceExpense } from '../utils/voiceExpenseParser.js';
import { useModalComputed } from './modal/useModalComputed.js';
import { useModalHandlers } from './modal/useModalHandlers.js';
import { useModalState } from './modal/useModalState.js';

export function useModalFlow({ store, copy, isEnglish, spendableAccounts, fmt, formatStoredInput }) {
  const [modal, setModal] = useState(null);
  const [voiceExpense, setVoiceExpense] = useState({ status: 'idle', transcript: '', message: '' });
  const voiceRequestRef = useRef(0);
  const {
    inputValue,
    setInputValue,
    selectedDebt,
    setSelectedDebt,
    selectedTransaction,
    setSelectedTransaction,
    debtForm,
    setDebtForm,
    transactionCategoryForm,
    setTransactionCategoryForm,
    selectedSpendAccountId,
    setSelectedSpendAccountId,
    resetModalState,
  } = useModalState({
    modal,
    spendableAccounts,
  });

  const {
    activeTransactionCategoryPresets,
    resolvedTransactionCategory,
    isModalAmountValid,
    modalHelperText,
    limitForecast,
    canSubmitAction,
  } = useModalComputed({
    modal,
    store,
    copy,
    isEnglish,
    spendableAccounts,
    fmt,
    inputValue,
    transactionCategoryForm,
    selectedSpendAccountId,
    selectedDebt,
    selectedTransaction,
  });

  const closeModal = () => {
    voiceRequestRef.current += 1;
    setVoiceExpense({ status: 'idle', transcript: '', message: '' });
    resetModalState();
    setModal(null);
  };

  useEffect(() => {
    if (!modal) return;
    measurePerf(`modal:${modal}:ready`, `modal:${modal}:start`, `modal:${modal}:ready-mark`);
  }, [modal]);

  const {
    openTransactionModal,
    openAmountModal,
    openDebtPaymentModal,
    openNewDebtModal,
    openEditDebtModal,
    openHistoryTransactionModal,
    openTransactionEditModal,
    handleAction,
    submitDebt,
    deleteSelectedDebt,
  } = useModalHandlers({
    store,
    spendableAccounts,
    formatStoredInput,
    closeModal,
    modal,
    inputValue,
    selectedDebt,
    selectedTransaction,
    selectedSpendAccountId,
    debtForm,
    setDebtForm,
    setModal,
    setInputValue,
    setSelectedDebt,
    setSelectedTransaction,
    setSelectedSpendAccountId,
    setTransactionCategoryForm,
    transactionCategoryForm,
    resolvedTransactionCategory,
    canSubmitAction,
  });

  const voiceErrorMessage = (error) => {
    const code = error instanceof OnDeviceSpeechError ? error.code : 'unknown';
    if (isEnglish) {
      if (code === 'unavailable')
        return 'On-device speech is unavailable. Download a system speech model or enter the expense manually.';
      if (code === 'permission_denied') return 'Microphone access is off. Allow it in Android settings and try again.';
      if (code === 'no_match') return 'Speech was not recognized. Speak closer to the phone and try again.';
      if (code === 'timeout') return 'Nothing was heard. Tap the microphone and try again.';
      if (code === 'busy') return 'Speech recognition is busy. Wait a moment and try again.';
      return 'Local speech recognition failed. You can still enter the expense manually.';
    }
    if (code === 'unavailable')
      return 'Локальное распознавание недоступно. Скачай системную языковую модель или введи расход вручную.';
    if (code === 'permission_denied') return 'Нет доступа к микрофону. Разреши его в настройках Android и повтори.';
    if (code === 'no_match') return 'Речь не распознана. Скажи фразу ближе к телефону и повтори.';
    if (code === 'timeout') return 'Ничего не услышал. Нажми микрофон и повтори.';
    if (code === 'busy') return 'Распознавание занято. Подожди секунду и повтори.';
    return 'Не удалось распознать речь локально. Расход можно ввести вручную.';
  };

  const startVoiceExpense = async () => {
    const requestId = ++voiceRequestRef.current;
    openTransactionModal('expense');
    setVoiceExpense({ status: 'listening', transcript: '', message: '' });

    try {
      const transcript = await startOnDeviceSpeech(isEnglish ? 'en-US' : 'ru-RU');
      if (voiceRequestRef.current !== requestId) return;

      const categories = getActiveCategoryPresets({
        language: store.language,
        type: 'expense',
        transactions: store.transactions,
        hiddenPresets: store.hiddenExpensePresets?.[store.language] || [],
        copy,
      });
      const parsed = parseVoiceExpense(transcript, { categories, accounts: spendableAccounts });
      if (parsed.amountMinor <= 0) {
        setVoiceExpense({
          status: 'error',
          transcript,
          message: isEnglish
            ? `I heard “${transcript}”, but could not find an amount.`
            : `Услышал: «${transcript}», но не нашёл сумму.`,
        });
        return;
      }

      setInputValue(formatStoredInput(parsed.amountMinor));
      setTransactionCategoryForm({
        preset: parsed.categoryPreset,
        custom: parsed.customCategory,
        appearance: '',
      });
      if (parsed.accountId) setSelectedSpendAccountId(parsed.accountId);
      setVoiceExpense({ status: 'done', transcript, message: '' });
    } catch (error) {
      if (voiceRequestRef.current !== requestId) return;
      setVoiceExpense({ status: 'error', transcript: '', message: voiceErrorMessage(error) });
    }
  };

  return {
    modal,
    setModal: closeModal,
    inputValue,
    setInputValue,
    selectedDebt,
    selectedTransaction,
    debtForm,
    setDebtForm,
    transactionCategoryForm,
    setTransactionCategoryForm,
    selectedSpendAccountId,
    setSelectedSpendAccountId,
    activeTransactionCategoryPresets,
    removeIncomePreset: (preset) => store.hideIncomePreset(store.language, preset),
    removeExpensePreset: (preset) => store.hideExpensePreset(store.language, preset),
    modalHelperText,
    limitForecast,
    isModalAmountValid,
    handleAction,
    canSubmitAction,
    submitDebt,
    deleteSelectedDebt,
    openTransactionModal,
    openAmountModal,
    openDebtPaymentModal,
    openNewDebtModal,
    openEditDebtModal,
    openHistoryTransactionModal,
    openTransactionEditModal,
    voiceExpense,
    startVoiceExpense,
  };
}
