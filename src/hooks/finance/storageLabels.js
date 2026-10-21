export function buildStorageLabels(isEnglish) {
  return {
    title: isEnglish ? 'Accounts and buckets' : 'Места хранения',
    subtitle: isEnglish ? 'Spending account and savings buckets' : 'Основной и защищённые счета',
    liquidSplit: isEnglish ? 'Spending account' : 'Основной счёт',
    liquidHint: isEnglish
      ? 'Money for daily spending and essential bills goes here first.'
      : 'Деньги на жизнь и обязательные сначала попадают в основной счёт.',
    primaryFallback: isEnglish ? 'Spending account' : 'Основной счёт',
    secondaryFallback: '',
    safetyFallback: isEnglish ? 'Emergency fund' : 'Копилка: подушка',
    capitalFallback: isEnglish ? 'Capital bucket' : 'Копилка: капитал',
    sadakaFallback: isEnglish ? 'Sadaka charity' : 'Садака',
    sadakaHint: isEnglish ? 'Sadaka means charity or donation.' : 'Садака — пожертвование.',
    dedicatedPlaces: isEnglish ? 'Savings buckets' : 'Защищённые счета',
    save: isEnglish ? 'Save accounts' : 'Сохранить места',
    previewTitle: isEnglish ? 'Placement preview on income 50 000' : 'Пример раскладки на доходе 50 000',
    placementTitle: isEnglish ? 'Where this income goes' : 'Куда разложить этот доход',
    reserveNote: isEnglish
      ? 'Essential-bill reserve stays inside the spending account.'
      : 'Резерв под обязательные остаётся внутри основного счёта.',
    splitTotal: isEnglish ? 'Spending account share' : 'Доля основного счёта',
  };
}
