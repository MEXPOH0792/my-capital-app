import React from 'react';
import { Moon, Sun, X } from 'lucide-react';
import { formatMinorAsCurrency } from '../../utils/money.js';
import StartStep from './steps/StartStep.jsx';
import MoneyStep from './steps/MoneyStep.jsx';
import DebtsStep from './steps/DebtsStep.jsx';
import RequiredExpensesStep from './steps/RequiredExpensesStep.jsx';
import GoalsStep from './steps/GoalsStep.jsx';

const parseMoney = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) * 100 : 0;
};

export default function OnboardingSetupScreen(props) {
  const {
    copy,
    isEnglish,
    isDarkMode,
    theme,
    rootStyle,
    panelStyle,
    softPanelStyle,
    formatInput,
    fmt,
    onboardingStep,
    setOnboardingStep,
    balances,
    setBalances,
    accountFields,
    totalMoney,
    debts,
    addDebt,
    updateDebt,
    removeDebt,
    requiredExpenses,
    addRequiredExpense,
    updateRequiredExpense,
    removeRequiredExpense,
    targets,
    setTargets,
    allocationModes,
    onboardingMode,
    setOnboardingMode,
    submitOnboarding,
    isReconfigureMode,
    canExit,
    onExit,
    hasLiveHistory,
    toggleTheme,
    setLanguage,
  } = props;

  const onboardingCopy = copy.onboarding;
  const startCopy = onboardingCopy.start;
  const moneyCopy = onboardingCopy.money;
  const debtsCopy = onboardingCopy.debts;
  const requiredCopy = onboardingCopy.required;
  const goalsCopy = onboardingCopy.goals;

  const totalDebt = debts.reduce((sum, item) => sum + parseMoney(item.amount), 0);
  const totalRequired = requiredExpenses.reduce((sum, item) => sum + parseMoney(item.amount), 0);
  const currentStep = !isReconfigureMode && onboardingStep === 0 ? 1 : onboardingStep;
  const stepIndexes = isReconfigureMode ? [0, 1, 2, 3, 4] : currentStep >= 3 ? [1, 2, 3, 4] : [1, 2];
  const incomeSplit = allocationModes[onboardingMode]?.allocation || allocationModes.base.allocation;

  const goTo = (value) => setOnboardingStep(value);
  const next = () => setOnboardingStep(Math.min(currentStep + 1, 4));
  const back = () => setOnboardingStep(Math.max(currentStep - 1, isReconfigureMode ? 0 : 1));
  const formatMoney = typeof fmt === 'function' ? fmt : (value) => formatMinorAsCurrency(value);

  const stepProps = {
    theme,
    panelStyle,
    softPanelStyle,
  };

  return (
    <div
      className="fixed inset-0 overflow-y-auto overscroll-contain pb-[calc(10px+var(--safe-bottom))] [&_input]:focus-visible:ring-2 [&_input]:focus-visible:ring-emerald-500 [&_button]:focus-visible:outline [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-emerald-500"
      style={rootStyle}
    >
      <div className="mx-auto min-h-full w-full max-w-2xl pb-10">
        <div className="mx-auto w-full max-w-xl px-4 pb-2 pt-[calc(4px+var(--safe-top))] sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage('ru')}
                className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition-transform active:scale-[0.98] ${!isEnglish ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]' : 'border-[var(--mc-border)] bg-[var(--mc-soft)] opacity-70'}`}
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition-transform active:scale-[0.98] ${isEnglish ? 'border-emerald-500 bg-emerald-500/10 text-[var(--mc-positive)]' : 'border-[var(--mc-border)] bg-[var(--mc-soft)] opacity-70'}`}
              >
                EN
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-full border bg-[var(--mc-soft)] transition-transform active:scale-[0.98]"
                style={{ borderColor: theme.border }}
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              {canExit ? (
                <button
                  type="button"
                  onClick={onExit}
                  className="flex h-8 w-8 items-center justify-center rounded-full border bg-[var(--mc-soft)] opacity-70 transition-transform active:scale-[0.98]"
                  style={{ borderColor: theme.border }}
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex gap-1">
            {stepIndexes.map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                aria-current={index === currentStep ? 'step' : undefined}
                className="min-h-[44px] min-w-0 flex-1 text-left"
              >
                <div
                  className="h-1.5 rounded-full"
                  style={{ backgroundColor: index <= currentStep ? `${theme.accent}22` : 'var(--mc-soft)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: index < currentStep ? '100%' : index === currentStep ? '55%' : '0%',
                      backgroundColor: theme.accent,
                    }}
                  />
                </div>
                <p
                  className={`mt-1 text-sm font-semibold ${index === currentStep ? 'opacity-100' : 'opacity-60'}`}
                >
                  {onboardingCopy.steps[index]}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl px-4 pb-[calc(28px+var(--safe-bottom))] sm:px-6">
          {currentStep === 0 && (
            <StartStep
              copy={startCopy}
              isReconfigureMode={isReconfigureMode}
              hasLiveHistory={hasLiveHistory}
              onNext={next}
              {...stepProps}
            />
          )}

          {currentStep === 1 && (
            <MoneyStep
              copy={moneyCopy}
              onboardingCopy={onboardingCopy}
              totalMoney={formatMoney(totalMoney)}
              accountFields={accountFields}
              balances={balances}
              setBalances={setBalances}
              formatInput={formatInput}
              onBack={isReconfigureMode ? back : null}
              onNext={next}
              {...stepProps}
            />
          )}

          {currentStep === 2 && (
            <DebtsStep
              copy={debtsCopy}
              onboardingCopy={onboardingCopy}
              debts={debts}
              totalDebt={formatMoney(totalDebt)}
              addDebt={addDebt}
              updateDebt={updateDebt}
              removeDebt={removeDebt}
              formatInput={formatInput}
              onBack={back}
              onNext={isReconfigureMode ? next : submitOnboarding}
              onMoreSetup={isReconfigureMode ? null : next}
              incomeSplit={incomeSplit}
              {...stepProps}
            />
          )}

          {currentStep === 3 && (
            <RequiredExpensesStep
              copy={requiredCopy}
              onboardingCopy={onboardingCopy}
              requiredExpenses={requiredExpenses}
              totalRequired={formatMoney(totalRequired)}
              addRequiredExpense={addRequiredExpense}
              updateRequiredExpense={updateRequiredExpense}
              removeRequiredExpense={removeRequiredExpense}
              formatInput={formatInput}
              onBack={back}
              onNext={next}
              {...stepProps}
            />
          )}

          {currentStep === 4 && (
            <GoalsStep
              copy={goalsCopy}
              totalMoney={formatMoney(totalMoney)}
              totalDebt={formatMoney(totalDebt)}
              totalRequired={formatMoney(totalRequired)}
              targets={targets}
              setTargets={setTargets}
              allocationModes={allocationModes}
              onboardingMode={onboardingMode}
              setOnboardingMode={setOnboardingMode}
              formatInput={formatInput}
              isReconfigureMode={isReconfigureMode}
              onBack={back}
              onSubmit={submitOnboarding}
              {...stepProps}
            />
          )}
        </div>
      </div>
    </div>
  );
}
