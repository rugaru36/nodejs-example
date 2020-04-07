var Enum = {
  // DocumentType: {
  //     disclaimer :'Дисклеймер',
  // },

  OrderType: {
    product48H: 'Медитация - 48ч',
    product1M: 'Медитация - 1 месяц',
    product12M: 'Медитация - 12 месяцев',
    productSet1M: 'Сет - 1 месяц',
    productSet12M: 'Сет - 12 месяцев',
    vipAccess3M: 'Полный доступ - 3 месяца',
    vipAccess6M: 'Полный доступ - 6 месяцев',
    vipAccess12M: 'Полный доступ - 12 месяцев'
  },

  DocumentType: {
    FAQ: 'Частые вопросы',
    Regular: 'Регулярные',
  },
  CategoryType: {
    flowers: 'Цветы',
    food: 'Еда'
  },
  ProductType: {
    lessThen7: 'До 7 мин.',
    from7To25: '7 - 25 мин.',
    from25To45: '25 - 45 мин.'
  },
  PaymentType: {
    card: 'По карте',
    applePay: 'ApplePay',
    cardToCourier: 'Картой курьеру',
    cash: 'Наличные',
  },
  UserType: {
    admin: 'Администратор',
    clint: 'Клиент'
  },
  AnnounceType: {
    video: "Видео",
    event: "Событие"
  }
}
module.exports = Enum;