// Trilingual copy for the marketing landing page (EN / KH / ZH).
import type { Language } from '@angkorgo/shared';

export const LANGS: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'km', label: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

export type LandingCopy = {
  nav: { services: string; how: string; promos: string; providers: string; admin: string };
  hero: { badge: string; title1: string; title2: string; sub: string; tagline: string; ios: string; android: string };
  mockup: { hi: string; search: string; firstRide: string; welcome: string };
  quick: { topUp: string; coupons: string; invite: string; rewards: string };
  groups: { getAround: string; orderShop: string };
  noResults: string;
  service: { cta: string };
  desc: Record<string, string>;
  w: Record<string, string>;
  how: { title: string; steps: { title: string; body: string }[] };
  deal: { week: string; title: string; sub: string; cta: string; badge: string };
  promos: { title: string; sub: string; cta: string };
  prov: { title: string; sub: string; cta: string; pct: string; pctSub: string; b1: string; b2: string; b3: string };
  footer: { rights: string; promotions: string; privacy: string; terms: string; admin: string };
};

export const COPY: Record<Language, LandingCopy> = {
  en: {
    nav: { services: 'Services', how: 'How it works', promos: 'Promotions', providers: 'For providers', admin: 'Admin' },
    hero: {
      badge: "Meet Tuki · Cambodia's super-app",
      title1: 'One app.', title2: 'Every way to go.',
      sub: 'Rides, food, rentals, stays & roadside repair — matched nearby and paid with one wallet.',
      tagline: 'Help is on the way', ios: 'Download for iOS', android: 'Get it on Android',
    },
    mockup: { hi: 'Hi there 👋', search: 'What do you need today?', firstRide: 'First ride free', welcome: 'Welcome to AngkorGo' },
    quick: { topUp: 'Top up', coupons: 'Coupons', invite: 'Invite', rewards: 'Rewards' },
    groups: { getAround: 'Get around', orderShop: 'Order & shop' },
    noResults: 'No matches — try another service',
    service: { cta: 'Got it' },
    desc: {
      ride: 'Book a moto, tuk-tuk or car and track your driver live.',
      food: 'Order from local restaurants, delivered hot to your door.',
      rent: 'Rent a car or van by the day from local owners.',
      stay: 'Find short-term places to stay across Cambodia.',
      repair: 'A mechanic comes to you — flat tire, battery, tow, fuel & more.',
      airport: 'Pre-book reliable airport pickups and drop-offs.',
      schedule: 'Plan a ride in advance for the time you need.',
      spin: 'Spin the wheel daily for discounts and rewards.',
      mart: 'Groceries and essentials delivered from nearby shops.',
      grocery: 'Fresh produce and daily goods to your door.',
      coupons: 'Save with vouchers and deals across every service.',
      rewards: 'Earn points on every trip, order and booking.',
      wallet: 'One balance for rides, food, rentals and more.',
      more: 'New services are on the way — stay tuned.',
      topUp: 'Add funds to your AngkorGo wallet in seconds.',
      invite: 'Invite friends and both of you earn rewards.',
    },
    w: { ride: 'Ride', food: 'Food', rent: 'Rent', stay: 'Stay', repair: 'Repair', rewards: 'Rewards', wallet: 'Wallet', more: 'More', airport: 'Airport', schedule: 'Schedule', spin: 'Spin', mart: 'Mart', grocery: 'Grocery', coupons: 'Coupons' },
    how: {
      title: 'How AngkorGo works',
      steps: [
        { title: 'Choose a service', body: 'Ride, food, rental, stay or repair — all in one app.' },
        { title: 'We match you nearby', body: 'Your GPS connects you to the closest provider instantly.' },
        { title: 'Track in real time', body: 'Watch your provider approach live, with an ETA.' },
        { title: 'Pay your way', body: 'KHQR, ABA, Wing, ACLEDA, card or cash — one wallet.' },
      ],
    },
    deal: { week: 'Launch week', title: 'Up to 66% OFF', sub: 'Rides, food & deliveries across Phnom Penh — plus a free first ride with Tuki.', cta: 'Grab the deals', badge: 'NEW' },
    promos: { title: 'Launch promotions', sub: 'Trilingual posters — share on social or print for the street.', cta: 'See all posters' },
    prov: {
      title: 'Earn with AngkorGo',
      sub: 'Drivers, mechanics, vehicle owners and hosts: join the network, accept jobs nearby, and get paid to your wallet. You keep 90%.',
      cta: 'Become a provider', pct: '90%', pctSub: 'of every fare goes to you',
      b1: 'Instant nearby job offers', b2: 'Same-day wallet payouts', b3: 'Work across all five services',
    },
    footer: { rights: '© 2026 AngkorGo. All rights reserved.', promotions: 'Promotions', privacy: 'Privacy', terms: 'Terms', admin: 'Admin' },
  },

  km: {
    nav: { services: 'សេវាកម្ម', how: 'របៀបប្រើ', promos: 'ការផ្សព្វផ្សាយ', providers: 'សម្រាប់អ្នកផ្តល់សេវា', admin: 'អ្នកគ្រប់គ្រង' },
    hero: {
      badge: 'ស្គាល់ Tuki · កម្មវិធីរួមរបស់កម្ពុជា',
      title1: 'កម្មវិធីតែមួយ។', title2: 'គ្រប់មធ្យោបាយធ្វើដំណើរ។',
      sub: 'ការជិះ អាហារ ការជួល ការស្នាក់នៅ និងការជួសជុលតាមផ្លូវ — ផ្គូផ្គងនៅជិត និងបង់ប្រាក់ដោយកាបូបតែមួយ។',
      tagline: 'ជំនួយកំពុងតែមកដល់', ios: 'ទាញយកសម្រាប់ iOS', android: 'ទាញយកសម្រាប់ Android',
    },
    mockup: { hi: 'សួស្តី 👋', search: 'តើអ្នកត្រូវការអ្វីថ្ងៃនេះ?', firstRide: 'ជិះលើកដំបូងឥតគិតថ្លៃ', welcome: 'សូមស្វាគមន៍មកកាន់ AngkorGo' },
    quick: { topUp: 'បញ្ចូលទឹកប្រាក់', coupons: 'គូប៉ុង', invite: 'អញ្ជើញ', rewards: 'រង្វាន់' },
    groups: { getAround: 'ធ្វើដំណើរ', orderShop: 'កម្ម៉ង់ & ទិញ' },
    noResults: 'គ្មានលទ្ធផល — សាកល្បងសេវាផ្សេង',
    service: { cta: 'យល់ព្រម' },
    desc: {
      ride: 'កក់ម៉ូតូ តុកតុក ឬឡាន និងតាមដានអ្នកបើកបរផ្ទាល់។',
      food: 'កម្ម៉ង់ពីភោជនីយដ្ឋានក្នុងស្រុក ដឹកជូនដល់ផ្ទះក្តៅៗ។',
      rent: 'ជួលឡាន ឬរថយន្តដឹកតាមថ្ងៃ ពីម្ចាស់ក្នុងស្រុក។',
      stay: 'ស្វែងរកកន្លែងស្នាក់នៅរយៈពេលខ្លីទូទាំងកម្ពុជា។',
      repair: 'ជាងម៉ាស៊ីនមកដល់អ្នក — កង់បែក ថ្មអស់ អូសរថ ប្រេង និងច្រើនទៀត។',
      airport: 'កក់ជាមុននូវការទទួល និងដឹកទៅព្រលានយន្តហោះ។',
      schedule: 'គ្រោងទុកការជិះជាមុនតាមពេលដែលអ្នកត្រូវការ។',
      spin: 'បង្វិលកង់ជារៀងរាល់ថ្ងៃដើម្បីទទួលការបញ្ចុះតម្លៃ និងរង្វាន់។',
      mart: 'គ្រឿងទេស និងរបស់ចាំបាច់ដឹកជូនពីហាងក្បែរអ្នក។',
      grocery: 'បន្លែស្រស់ និងទំនិញប្រចាំថ្ងៃដល់ផ្ទះអ្នក។',
      coupons: 'សន្សំជាមួយប័ណ្ណ និងការផ្តល់ជូនគ្រប់សេវាកម្ម។',
      rewards: 'ទទួលពិន្ទុរាល់ដំណើរ ការកម្ម៉ង់ និងការកក់។',
      wallet: 'សមតុល្យតែមួយសម្រាប់ការជិះ អាហារ ការជួល និងច្រើនទៀត។',
      more: 'សេវាកម្មថ្មីៗកំពុងមកដល់ — សូមរង់ចាំ។',
      topUp: 'បញ្ចូលទឹកប្រាក់ទៅកាបូប AngkorGo ក្នុងរយៈពេលពីរបីវិនាទី។',
      invite: 'អញ្ជើញមិត្តភក្តិ ហើយអ្នកទាំងពីរទទួលបានរង្វាន់។',
    },
    w: { ride: 'ជិះ', food: 'អាហារ', rent: 'ជួល', stay: 'ស្នាក់នៅ', repair: 'ជួសជុល', rewards: 'រង្វាន់', wallet: 'កាបូប', more: 'ច្រើនទៀត', airport: 'ព្រលានយន្តហោះ', schedule: 'កំណត់ពេល', spin: 'បង្វិល', mart: 'ផ្សារ', grocery: 'គ្រឿងទេស', coupons: 'គូប៉ុង' },
    how: {
      title: 'របៀប AngkorGo ដំណើរការ',
      steps: [
        { title: 'ជ្រើសរើសសេវាកម្ម', body: 'ការជិះ អាហារ ការជួល ការស្នាក់នៅ ឬការជួសជុល — ទាំងអស់ក្នុងកម្មវិធីតែមួយ។' },
        { title: 'យើងផ្គូផ្គងអ្នកនៅជិត', body: 'GPS របស់អ្នកភ្ជាប់អ្នកទៅអ្នកផ្តល់សេវាដ៏ជិតបំផុតភ្លាមៗ។' },
        { title: 'តាមដានតាមពេលវេលាជាក់ស្តែង', body: 'មើលអ្នកផ្តល់សេវាកំពុងខិតជិត ជាមួយពេលវេលាមកដល់។' },
        { title: 'បង់ប្រាក់តាមរបៀបរបស់អ្នក', body: 'KHQR, ABA, Wing, ACLEDA, កាត ឬសាច់ប្រាក់ — កាបូបតែមួយ។' },
      ],
    },
    deal: { week: 'សប្តាហ៍បើកដំណើរការ', title: 'បញ្ចុះតម្លៃរហូតដល់ 66%', sub: 'ការជិះ អាហារ និងការដឹកជញ្ជូនទូទាំងភ្នំពេញ — បូករួមការជិះលើកដំបូងឥតគិតថ្លៃជាមួយ Tuki។', cta: 'ទទួលការផ្តល់ជូន', badge: 'ថ្មី' },
    promos: { title: 'ការផ្សព្វផ្សាយបើកដំណើរការ', sub: 'ផ្ទាំងបដាបីភាសា — ចែករំលែកលើបណ្តាញសង្គម ឬបោះពុម្ពសម្រាប់ផ្លូវ។', cta: 'មើលផ្ទាំងបដាទាំងអស់' },
    prov: {
      title: 'រកចំណូលជាមួយ AngkorGo',
      sub: 'អ្នកបើកបរ ជាងម៉ាស៊ីន ម្ចាស់យានយន្ត និងម្ចាស់ផ្ទះ៖ ចូលរួមបណ្តាញ ទទួលការងារនៅជិត ហើយទទួលប្រាក់ចូលកាបូបរបស់អ្នក។ អ្នករក្សាបាន 90%។',
      cta: 'ក្លាយជាអ្នកផ្តល់សេវា', pct: '90%', pctSub: 'នៃថ្លៃដំណើរនីមួយៗទៅអ្នក',
      b1: 'ការផ្តល់ការងារនៅជិតភ្លាមៗ', b2: 'ការបើកប្រាក់ចូលកាបូបនៅថ្ងៃតែមួយ', b3: 'ធ្វើការទូទាំងសេវាកម្មទាំងប្រាំ',
    },
    footer: { rights: '© 2026 AngkorGo. រក្សាសិទ្ធិគ្រប់យ៉ាង។', promotions: 'ការផ្សព្វផ្សាយ', privacy: 'ភាពឯកជន', terms: 'លក្ខខណ្ឌ', admin: 'អ្នកគ្រប់គ្រង' },
  },

  zh: {
    nav: { services: '服务', how: '使用方法', promos: '促销', providers: '成为服务商', admin: '管理' },
    hero: {
      badge: '认识 Tuki · 柬埔寨超级应用',
      title1: '一个应用。', title2: '畅行每一程。',
      sub: '打车、美食、租车、住宿和道路维修 — 就近匹配，一个钱包支付。',
      tagline: '帮助即将到达', ios: 'iOS 版下载', android: 'Android 版下载',
    },
    mockup: { hi: '你好 👋', search: '今天需要什么？', firstRide: '首程免费', welcome: '欢迎使用 AngkorGo' },
    quick: { topUp: '充值', coupons: '优惠券', invite: '邀请', rewards: '奖励' },
    groups: { getAround: '出行', orderShop: '订购 & 购物' },
    noResults: '无匹配结果 — 试试其他服务',
    service: { cta: '知道了' },
    desc: {
      ride: '预约摩托车、嘟嘟车或汽车，实时追踪司机。',
      food: '从本地餐厅点餐，热腾腾送到家门口。',
      rent: '按天租用本地车主的汽车或货车。',
      stay: '在柬埔寨各地寻找短租住宿。',
      repair: '技师上门 — 补胎、电瓶、拖车、加油等。',
      airport: '提前预约可靠的机场接送。',
      schedule: '按您需要的时间提前预约行程。',
      spin: '每天转动转盘，赢取折扣和奖励。',
      mart: '从附近商店配送杂货和日用品。',
      grocery: '新鲜果蔬和日用品送到家。',
      coupons: '使用优惠券和各项服务的优惠省钱。',
      rewards: '每次出行、订购和预订均可赚取积分。',
      wallet: '一个余额，畅享打车、美食、租车等。',
      more: '更多服务即将推出 — 敬请期待。',
      topUp: '几秒钟为您的 AngkorGo 钱包充值。',
      invite: '邀请好友，双方均可获得奖励。',
    },
    w: { ride: '打车', food: '美食', rent: '租车', stay: '住宿', repair: '维修', rewards: '奖励', wallet: '钱包', more: '更多', airport: '机场', schedule: '预约', spin: '转盘', mart: '商城', grocery: '生鲜', coupons: '优惠券' },
    how: {
      title: 'AngkorGo 如何运作',
      steps: [
        { title: '选择服务', body: '打车、美食、租车、住宿或维修 — 尽在一个应用。' },
        { title: '就近为您匹配', body: 'GPS 立即为您连接最近的服务商。' },
        { title: '实时追踪', body: '实时查看服务商的位置和预计到达时间。' },
        { title: '随心支付', body: 'KHQR、ABA、Wing、ACLEDA、银行卡或现金 — 一个钱包。' },
      ],
    },
    deal: { week: '开业周', title: '最高立减 66%', sub: '金边全城打车、美食和配送 — 还有 Tuki 送出的首程免费。', cta: '抢购优惠', badge: '新' },
    promos: { title: '开业促销', sub: '三语海报 — 可分享至社交媒体或打印张贴。', cta: '查看所有海报' },
    prov: {
      title: '加入 AngkorGo 赚钱',
      sub: '司机、技师、车主和房东：加入网络，就近接单，收入直达您的钱包。您可保留 90%。',
      cta: '成为服务商', pct: '90%', pctSub: '每笔车费归您所有',
      b1: '即时就近接单', b2: '当日钱包结算', b3: '覆盖全部五项服务',
    },
    footer: { rights: '© 2026 AngkorGo。保留所有权利。', promotions: '促销', privacy: '隐私', terms: '条款', admin: '管理' },
  },
};
