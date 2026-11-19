export function buildStorageLabels(isEnglish) {
  return {
    title: isEnglish ? 'Accounts and buckets' : 'Где мои деньги',
    subtitle: isEnglish ? 'Spending account and savings buckets' : 'Деньги на каждый день и накопления',
    liquidSplit: isEnglish ? 'Spending account' : 'На каждый день',
    liquidHint: isEnglish
      ? 'Money for daily spending and essential bills goes here first.'
      : 'Здесь учитываются деньги на повседневные и нужные траты.',
    primaryFallback: isEnglish ? 'Spending account' : 'На каждый день',
    secondaryFallback: '',
    safetyFallback: isEnglish ? 'Emergency fund' : 'На случай трудностей',
    capitalFallback: isEnglish ? 'Capital bucket' : 'Накопления на будущее',
    sadakaFallback: isEnglish ? 'Sadaka charity' : 'Помощь другим',
    sadakaHint: isEnglish ? 'Sadaka means charity or donation.' : 'Садака — пожертвование.',
    dedicatedPlaces: isEnglish ? 'Savings buckets' : 'Отложенные деньги',
    save: isEnglish ? 'Save accounts' : 'Сохранить',
    previewTitle: isEnglish ? 'Placement preview on income 50 000' : 'Пример: доход 50 000',
    placementTitle: isEnglish ? 'Where this income goes' : 'На что пойдёт этот доход',
    reserveNote: isEnglish
      ? 'Essential-bill reserve stays inside the spending account.'
      : 'Деньги на нужные траты учитываются в сумме «На каждый день».',
    splitTotal: isEnglish ? 'Spending account share' : 'Часть дохода на каждый день',
  };
}
