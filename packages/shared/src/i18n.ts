// Minimal i18n dictionary (EN/KH). Keys are shared across web + mobile.
import type { Language, ServiceCategory } from './constants';

type Dict = Record<string, string>;

export const CATEGORY_LABELS: Record<Language, Record<ServiceCategory, string>> = {
  en: {
    flat_tire: 'Flat Tire',
    battery_jump_start: 'Dead Battery',
    battery_replacement: 'Battery Replacement',
    fuel_delivery: 'Out of Fuel',
    lockout_service: 'Lockout',
    tow_truck: 'Tow Truck',
    engine_diagnosis: 'Engine Trouble',
    emergency_repair: 'Emergency Repair',
    motorcycle_repair: 'Motorcycle Repair',
    car_repair: 'Car Repair',
    van_repair: 'Van Repair',
    truck_repair: 'Truck Repair',
  },
  km: {
    flat_tire: 'កង់​បែក',
    battery_jump_start: 'ថ្ម​អស់',
    battery_replacement: 'ប្តូរ​ថ្ម',
    fuel_delivery: 'អស់​ប្រេង',
    lockout_service: 'ចាក់​សោ​ជាប់',
    tow_truck: 'រថ​អូស',
    engine_diagnosis: 'បញ្ហា​ម៉ាស៊ីន',
    emergency_repair: 'ជួសជុល​បន្ទាន់',
    motorcycle_repair: 'ជួសជុល​ម៉ូតូ',
    car_repair: 'ជួសជុល​ឡាន',
    van_repair: 'ជួសជុល​រថយន្ត​ដឹក',
    truck_repair: 'ជួសជុល​ឡាន​ធំ',
  },
  zh: {
    flat_tire: '轮胎漏气',
    battery_jump_start: '电瓶没电',
    battery_replacement: '更换电瓶',
    fuel_delivery: '燃油耗尽',
    lockout_service: '开锁服务',
    tow_truck: '拖车',
    engine_diagnosis: '发动机故障',
    emergency_repair: '紧急维修',
    motorcycle_repair: '摩托车维修',
    car_repair: '汽车维修',
    van_repair: '面包车维修',
    truck_repair: '卡车维修',
  },
};

export const UI: Record<Language, Dict> = {
  en: {
    tagline: 'Help is on the way.',
    whats_wrong: "What's wrong?",
    confirm_location: 'Confirm your location',
    add_photos: 'Add photos',
    request_help: 'Request help',
    finding_help: 'Finding help nearby…',
    provider_on_the_way: 'Your provider is on the way',
    eta: 'ETA',
    chat: 'Chat',
    call: 'Call',
    pay_now: 'Pay now',
    rate_provider: 'Rate your provider',
  },
  km: {
    tagline: 'ជំនួយ​កំពុង​តែ​មក​ដល់។',
    whats_wrong: 'មាន​បញ្ហា​អ្វី?',
    confirm_location: 'បញ្ជាក់​ទីតាំង​របស់​អ្នក',
    add_photos: 'បន្ថែម​រូបភាព',
    request_help: 'ស្នើ​សុំ​ជំនួយ',
    finding_help: 'កំពុង​ស្វែងរក​ជំនួយ​នៅ​ក្បែរ…',
    provider_on_the_way: 'អ្នក​ផ្តល់​សេវា​កំពុង​មក',
    eta: 'ម៉ោង​មក​ដល់',
    chat: 'ជជែក',
    call: 'ហៅ',
    pay_now: 'បង់​ប្រាក់',
    rate_provider: 'វាយ​តម្លៃ​អ្នក​ផ្តល់​សេវា',
  },
  zh: {
    tagline: '帮助即将到达。',
    whats_wrong: '出了什么问题？',
    confirm_location: '确认您的位置',
    add_photos: '添加照片',
    request_help: '请求帮助',
    finding_help: '正在附近寻找帮助…',
    provider_on_the_way: '您的服务商正在赶来',
    eta: '预计到达时间',
    chat: '聊天',
    call: '拨打',
    pay_now: '立即支付',
    rate_provider: '评价服务商',
  },
};

export function t(lang: Language, key: string): string {
  return UI[lang]?.[key] ?? UI.en[key] ?? key;
}

export function categoryLabel(lang: Language, c: ServiceCategory): string {
  return CATEGORY_LABELS[lang][c];
}
