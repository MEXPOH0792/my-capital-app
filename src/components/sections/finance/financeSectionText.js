export const getFinanceSectionText = (isEnglish) => ({
  settingsTitle: isEnglish ? 'Interface and backup' : 'Интерфейс и резервная копия',
  versionLabel: isEnglish ? 'App version' : 'Версия приложения',
  settingsDescription: isEnglish ? 'Only key product controls.' : 'Только ключевые настройки.',
  startBaseTitle: isEnglish ? 'Reset start data' : 'Сброс стартовых данных',
  startBaseDescription: isEnglish
    ? 'This will restart onboarding and replace the starting values.'
    : 'Перезапустит первичную настройку и заменит стартовые значения.',
  startBaseAction: isEnglish ? 'Reconfigure start data' : 'Перенастроить стартовые данные',
  securityTitle: isEnglish ? 'PIN protection' : 'Защита PIN',
  securityDescription: isEnglish ? 'Lock access with a local PIN.' : 'Закрой доступ локальным PIN.',
  pinPlaceholder: isEnglish ? 'PIN code' : 'PIN-код',
  pinConfirmPlaceholder: isEnglish ? 'Repeat PIN' : 'Повтори PIN',
  savePin: isEnglish ? 'Enable PIN' : 'Включить PIN',
  removePin: isEnglish ? 'Disable PIN' : 'Выключить PIN',
  lockNow: isEnglish ? 'Lock now' : 'Заблокировать сейчас',
  pinEnabledNotice: isEnglish ? 'PIN protection is enabled.' : 'Защита PIN включена.',
  distributionTitle: isEnglish ? 'How income is split before spending' : 'Как доход делится до начала трат',
  distributionDescription: isEnglish
    ? 'This controls the pay-yourself-first rule.'
    : 'Здесь управляется логика «сначала себе».',
  obligationsTitle: isEnglish ? 'Essential monthly bills' : 'Обязательный минимум в месяц',
  obligationsDescription: isEnglish ? 'Cover these before savings growth starts.' : 'Их нужно закрыть до начала роста.',
  obligationsItems: isEnglish ? 'Bills' : 'Позиции',
  goalsTitle: isEnglish ? 'Targets linked to growth' : 'Цели, связанные с ростом',
  goalsDescription: isEnglish ? 'Edit your emergency fund and capital targets.' : 'Измени две целевые суммы.',
});
