export const getFinanceSectionText = (isEnglish) => ({
  settingsTitle: isEnglish ? 'Interface and backup' : 'Вид приложения и копия данных',
  versionLabel: isEnglish ? 'App version' : 'Версия приложения',
  startBaseTitle: isEnglish ? 'Reset start data' : 'Начальные суммы',
  startBaseDescription: isEnglish
    ? 'This will restart onboarding and replace the starting values.'
    : 'Можно заново указать начальные суммы. При сохранении история доходов и расходов будет удалена.',
  startBaseAction: isEnglish ? 'Reconfigure start data' : 'Заново указать начальные суммы',
  securityTitle: isEnglish ? 'PIN protection' : 'Защита PIN',
  securityDescription: isEnglish ? 'Lock access with a local PIN.' : 'Закрой доступ локальным PIN.',
  pinPlaceholder: isEnglish ? 'PIN code' : 'PIN-код',
  pinConfirmPlaceholder: isEnglish ? 'Repeat PIN' : 'Повтори PIN',
  savePin: isEnglish ? 'Enable PIN' : 'Включить PIN',
  removePin: isEnglish ? 'Disable PIN' : 'Выключить PIN',
  lockNow: isEnglish ? 'Lock now' : 'Заблокировать сейчас',
  pinEnabledNotice: isEnglish ? 'PIN protection is enabled.' : 'Защита PIN включена.',
  distributionTitle: isEnglish ? 'How income is split before spending' : 'Как доход делится до начала трат',
  distributionDescription: isEnglish ? 'This controls the pay-yourself-first rule.' : 'Выбери, сколько откладывать.',
  obligationsTitle: isEnglish ? 'Essential monthly bills' : 'Нужные траты каждый месяц',
  obligationsDescription: isEnglish
    ? 'Cover these before savings growth starts.'
    : 'Учти эти траты, когда решаешь, сколько откладывать.',
  obligationsItems: isEnglish ? 'Bills' : 'Расходы',
  goalsTitle: isEnglish ? 'Targets linked to growth' : 'Сколько хочешь накопить',
  goalsDescription: isEnglish
    ? 'Edit your emergency fund and capital targets.'
    : 'Укажи суммы на случай трудностей и на будущее.',
});
