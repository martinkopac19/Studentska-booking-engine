/**
 * Copy for the direct-booking e-mails, in the same five languages as the site.
 *
 * Guest e-mails go out in the language the guest picked when booking. The owner
 * notification is always Slovak — Martin is the only reader.
 *
 * Slovak and Czech use the formal register throughout; the guest is a customer,
 * not a friend.
 */

import type { Lang } from "../i18n.js";

export const LOCALES: Record<Lang, string> = { en: "en-GB", cs: "cs-CZ", de: "de-DE", sk: "sk-SK", uk: "uk-UA" };

export function nightsWord(n: number, lang: Lang): string {
  const f: Record<Lang, (n: number) => string> = {
    en: (n: number) => (n === 1 ? "1 night" : `${n} nights`),
    de: (n: number) => (n === 1 ? "1 Nacht" : `${n} Nächte`),
    cs: (n: number) => (n === 1 ? "1 noc" : n < 5 ? `${n} noci` : `${n} nocí`),
    sk: (n: number) => (n === 1 ? "1 noc" : n < 5 ? `${n} noci` : `${n} nocí`),
    uk: (n: number) => {
      const a = n % 10, b = n % 100;
      if (a === 1 && b !== 11) return `${n} ніч`;
      if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return `${n} ночі`;
      return `${n} ночей`;
    },
  };
  return (f[lang] ?? f.en)(n);
}

export function guestsWord(n: number, lang: Lang): string {
  const f: Record<Lang, (n: number) => string> = {
    en: (n: number) => (n === 1 ? "1 guest" : `${n} guests`),
    de: (n: number) => (n === 1 ? "1 Gast" : `${n} Gäste`),
    cs: (n: number) => (n === 1 ? "1 host" : n < 5 ? `${n} hosté` : `${n} hostů`),
    sk: (n: number) => (n === 1 ? "1 hosť" : n < 5 ? `${n} hostia` : `${n} hostí`),
    uk: (n: number) => {
      const a = n % 10, b = n % 100;
      if (a === 1 && b !== 11) return `${n} гість`;
      if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return `${n} гості`;
      return `${n} гостей`;
    },
  };
  return (f[lang] ?? f.en)(n);
}

/**
 * Typing every key explicitly is not ceremony: it makes the compiler fail when
 * a language is missing a string, which is exactly the kind of gap that would
 * otherwise ship as `undefined` in a guest's inbox.
 */
export interface BookingStrings {
  subjectConfirm: (code: string) => string;
  preheaderConfirm: (amount: string) => string;
  hi: (name: string) => string;
  confirmIntro: string;
  codeLabel: string;
  stayTitle: string;
  checkin: string;
  checkout: string;
  guests: string;
  length: string;
  priceTitle: string;
  accommodation: string;
  cleaning: string;
  cityTax: string;
  discount: string;
  total: string;
  payTitle: string;
  payLead: (due: string) => string;
  qrHint: string;
  amount: string;
  vs: string;
  account: string;
  iban: string;
  bic: string;
  holder: string;
  message: string;
  revolut: string;
  noDetails: string;
  paidNote: string;
  nextTitle: string;
  n1: string;
  n2: string;
  n3: string;
  n4: string;
  addressTitle: string;
  checkinTime: string;
  questions: string;
  thanks: string;
  subjectReminder: (code: string) => string;
  preheaderReminder: (due: string) => string;
  reminderIntro: (due: string) => string;
  reminderIfPaid: string;
}

export const S: Record<Lang, BookingStrings> = {
  en: {
    subjectConfirm: c => `Your booking is confirmed — ${c}`,
    preheaderConfirm: a => `Please pay ${a} within 48 hours to secure your dates.`,
    hi: n => `Hi ${n},`,
    confirmIntro:
      "your stay in Prague is booked. Here is everything in one place — keep this e-mail, you will need the code.",
    codeLabel: "Booking code",
    stayTitle: "Your stay",
    checkin: "Check-in", checkout: "Check-out",
    guests: "Guests", length: "Length of stay",
    priceTitle: "Price",
    accommodation: "Accommodation", cleaning: "Cleaning fee",
    cityTax: "City tax", discount: "Discount", total: "Total",
    payTitle: "How to pay",
    payLead: d => `Please pay by <strong>${d}</strong>. If the payment does not arrive by then, the booking is cancelled automatically and the dates are released.`,
    qrHint: "Scan this QR code with your banking app, or use the details below.",
    amount: "Amount", vs: "Reference", account: "Account",
    iban: "IBAN", bic: "BIC", holder: "Beneficiary", message: "Message",
    revolut: "Revolut",
    noDetails: "We will send you the payment details in a separate e-mail shortly.",
    paidNote: "This booking is already paid. Nothing else is needed.",
    nextTitle: "What happens next",
    n1: "You pay — by bank transfer or Revolut.",
    n2: "We confirm the payment, usually the same day.",
    n3: "Before arrival you fill in a short registration form. Czech law requires it from every accommodation provider.",
    n4: "You then receive the entry codes for the building and the apartment.",
    addressTitle: "Where you are going",
    checkinTime: "Check-in from 15:00, check-out by 11:00.",
    questions: "Questions? Just reply to this e-mail.",
    thanks: "Thank you for booking directly — it means a lot.",

    subjectReminder: c => `Reminder: payment for booking ${c}`,
    preheaderReminder: d => `Your dates are held until ${d}.`,
    reminderIntro: d =>
      `we have not received your payment yet. Your dates are held until <strong>${d}</strong>; after that the booking is cancelled automatically and the apartment goes back on sale.`,
    reminderIfPaid: "If you have paid in the last few hours, please ignore this e-mail — bank transfers take a while to arrive.",
  },
  sk: {
    subjectConfirm: c => `Rezervácia je potvrdená — ${c}`,
    preheaderConfirm: a => `Zaplaťte ${a} do 48 hodín a termín je váš.`,
    hi: n => `Dobrý deň, ${n},`,
    confirmIntro:
      "pobyt v Prahe je rezervovaný. Tu máte všetko na jednom mieste — e-mail si odložte, kód budete potrebovať.",
    codeLabel: "Kód rezervácie",
    stayTitle: "Váš pobyt",
    checkin: "Príchod", checkout: "Odchod",
    guests: "Hostia", length: "Dĺžka pobytu",
    priceTitle: "Cena",
    accommodation: "Ubytovanie", cleaning: "Upratovanie",
    cityTax: "Poplatok z pobytu", discount: "Zľava", total: "Celkom",
    payTitle: "Ako zaplatiť",
    payLead: d => `Zaplaťte do <strong>${d}</strong>. Ak platba dovtedy nedorazí, rezervácia sa automaticky ruší a termín sa uvoľní.`,
    qrHint: "Naskenujte QR kód bankovou aplikáciou alebo použite údaje nižšie.",
    amount: "Suma", vs: "Variabilný symbol", account: "Účet",
    iban: "IBAN", bic: "BIC", holder: "Príjemca", message: "Správa pre príjemcu",
    revolut: "Revolut",
    noDetails: "Platobné údaje vám pošleme v samostatnom e-maile.",
    paidNote: "Táto rezervácia je už zaplatená. Nič ďalšie netreba.",
    nextTitle: "Čo bude ďalej",
    n1: "Zaplatíte — prevodom alebo cez Revolut.",
    n2: "Platbu potvrdíme, zvyčajne ešte v ten deň.",
    n3: "Pred príchodom vyplníte krátky registračný formulár. Vyžaduje ho zákon od každého ubytovateľa.",
    n4: "Potom dostanete vstupné kódy do budovy a do bytu.",
    addressTitle: "Kam ideš",
    checkinTime: "Príchod od 15:00, odchod do 11:00.",
    questions: "Máte otázku? Stačí odpovedať na tento e-mail.",
    thanks: "Ďakujem, že ste rezervovali priamo — veľa to znamená.",

    subjectReminder: c => `Pripomienka: platba za rezerváciu ${c}`,
    preheaderReminder: d => `Termín vám držíme do ${d}.`,
    reminderIntro: d =>
      `platba nám zatiaľ nedorazila. Termín vám držíme do <strong>${d}</strong>; potom sa rezervácia automaticky ruší a apartmán ide späť do predaja.`,
    reminderIfPaid: "Ak ste platili v posledných hodinách, tento e-mail ignorujte — prevod chvíľu trvá.",
  },
  cs: {
    subjectConfirm: c => `Rezervace je potvrzena — ${c}`,
    preheaderConfirm: a => `Zaplaťte ${a} do 48 hodin a termín je váš.`,
    hi: n => `Dobrý den, ${n},`,
    confirmIntro:
      "pobyt v Praze je rezervovaný. Tady máte všechno na jednom místě — e-mail si uschovejte, kód budete potřebovat.",
    codeLabel: "Kód rezervace",
    stayTitle: "Váš pobyt",
    checkin: "Příjezd", checkout: "Odjezd",
    guests: "Hosté", length: "Délka pobytu",
    priceTitle: "Cena",
    accommodation: "Ubytování", cleaning: "Úklid",
    cityTax: "Poplatek z pobytu", discount: "Sleva", total: "Celkem",
    payTitle: "Jak zaplatit",
    payLead: d => `Zaplaťte do <strong>${d}</strong>. Pokud platba do té doby nedorazí, rezervace se automaticky ruší a termín se uvolní.`,
    qrHint: "Naskenujte QR kód bankovní aplikací, nebo použijte údaje níže.",
    amount: "Částka", vs: "Variabilní symbol", account: "Účet",
    iban: "IBAN", bic: "BIC", holder: "Příjemce", message: "Zpráva pro příjemce",
    revolut: "Revolut",
    noDetails: "Platební údaje vám pošleme v samostatném e-mailu.",
    paidNote: "Tato rezervace je již zaplacena. Nic dalšího není potřeba.",
    nextTitle: "Co bude dál",
    n1: "Zaplatíte — převodem nebo přes Revolut.",
    n2: "Platbu potvrdíme, obvykle ještě týž den.",
    n3: "Před příjezdem vyplníte krátký registrační formulář. Vyžaduje ho zákon od každého ubytovatele.",
    n4: "Poté dostanete vstupní kódy do budovy a do bytu.",
    addressTitle: "Kam jedete",
    checkinTime: "Příjezd od 15:00, odjezd do 11:00.",
    questions: "Máte dotaz? Stačí odpovědět na tento e-mail.",
    thanks: "Děkuji, že jste rezervovali přímo — moc si toho vážím.",

    subjectReminder: c => `Připomínka: platba za rezervaci ${c}`,
    preheaderReminder: d => `Termín vám držíme do ${d}.`,
    reminderIntro: d =>
      `platba nám zatím nedorazila. Termín vám držíme do <strong>${d}</strong>; poté se rezervace automaticky ruší a apartmán jde zpět do prodeje.`,
    reminderIfPaid: "Pokud jste platili v posledních hodinách, tento e-mail ignorujte — převod chvíli trvá.",
  },
  de: {
    subjectConfirm: c => `Ihre Buchung ist bestätigt — ${c}`,
    preheaderConfirm: a => `Bitte zahlen Sie ${a} innerhalb von 48 Stunden.`,
    hi: n => `Hallo ${n},`,
    confirmIntro:
      "Ihr Aufenthalt in Prag ist gebucht. Hier finden Sie alles auf einen Blick — bewahren Sie diese E-Mail auf, den Code brauchen Sie noch.",
    codeLabel: "Buchungscode",
    stayTitle: "Ihr Aufenthalt",
    checkin: "Anreise", checkout: "Abreise",
    guests: "Gäste", length: "Aufenthaltsdauer",
    priceTitle: "Preis",
    accommodation: "Unterkunft", cleaning: "Endreinigung",
    cityTax: "Kurtaxe", discount: "Rabatt", total: "Gesamt",
    payTitle: "So bezahlen Sie",
    payLead: d => `Bitte bis <strong>${d}</strong> bezahlen. Geht die Zahlung bis dahin nicht ein, wird die Buchung automatisch storniert und der Termin freigegeben.`,
    qrHint: "Scannen Sie den QR-Code mit Ihrer Banking-App oder nutzen Sie die Daten unten.",
    amount: "Betrag", vs: "Verwendungszweck", account: "Konto",
    iban: "IBAN", bic: "BIC", holder: "Empfänger", message: "Nachricht",
    revolut: "Revolut",
    noDetails: "Die Zahlungsdaten senden wir Ihnen in einer separaten E-Mail.",
    paidNote: "Diese Buchung ist bereits bezahlt. Es ist nichts weiter zu tun.",
    nextTitle: "Wie es weitergeht",
    n1: "Sie zahlen — per Überweisung oder Revolut.",
    n2: "Wir bestätigen den Zahlungseingang, meist noch am selben Tag.",
    n3: "Vor der Anreise füllen Sie ein kurzes Meldeformular aus. Das tschechische Gesetz verlangt es von jedem Gastgeber.",
    n4: "Danach erhalten Sie die Zugangscodes für Haus und Wohnung.",
    addressTitle: "Wohin Sie fahren",
    checkinTime: "Anreise ab 15:00 Uhr, Abreise bis 11:00 Uhr.",
    questions: "Fragen? Antworten Sie einfach auf diese E-Mail.",
    thanks: "Danke, dass Sie direkt gebucht haben — das bedeutet mir viel.",

    subjectReminder: c => `Erinnerung: Zahlung für Buchung ${c}`,
    preheaderReminder: d => `Wir halten Ihren Termin bis ${d}.`,
    reminderIntro: d =>
      `Ihre Zahlung ist noch nicht eingegangen. Wir halten Ihren Termin bis <strong>${d}</strong>; danach wird die Buchung automatisch storniert.`,
    reminderIfPaid: "Falls Sie in den letzten Stunden gezahlt haben, ignorieren Sie diese E-Mail bitte — Überweisungen brauchen etwas Zeit.",
  },
  uk: {
    subjectConfirm: c => `Бронювання підтверджено — ${c}`,
    preheaderConfirm: a => `Сплатіть ${a} протягом 48 годин.`,
    hi: n => `Вітаємо, ${n},`,
    confirmIntro:
      "ваше перебування у Празі заброньовано. Тут усе в одному місці — збережіть цей лист, код вам ще знадобиться.",
    codeLabel: "Код бронювання",
    stayTitle: "Ваше перебування",
    checkin: "Заїзд", checkout: "Виїзд",
    guests: "Гості", length: "Тривалість",
    priceTitle: "Ціна",
    accommodation: "Проживання", cleaning: "Прибирання",
    cityTax: "Туристичний збір", discount: "Знижка", total: "Разом",
    payTitle: "Як сплатити",
    payLead: d => `Сплатіть до <strong>${d}</strong>. Якщо оплата не надійде, бронювання буде скасовано автоматично, а дати звільняться.`,
    qrHint: "Відскануйте QR-код банківським застосунком або скористайтеся реквізитами нижче.",
    amount: "Сума", vs: "Призначення платежу", account: "Рахунок",
    iban: "IBAN", bic: "BIC", holder: "Одержувач", message: "Повідомлення",
    revolut: "Revolut",
    noDetails: "Платіжні реквізити надішлемо окремим листом.",
    paidNote: "Це бронювання вже оплачено. Більше нічого не потрібно.",
    nextTitle: "Що далі",
    n1: "Ви сплачуєте — переказом або через Revolut.",
    n2: "Ми підтверджуємо оплату, зазвичай того ж дня.",
    n3: "Перед заїздом заповните коротку реєстраційну форму. Цього вимагає чеський закон від кожного власника житла.",
    n4: "Після цього отримаєте коди доступу до будинку та квартири.",
    addressTitle: "Куди ви їдете",
    checkinTime: "Заїзд з 15:00, виїзд до 11:00.",
    questions: "Питання? Просто дайте відповідь на цей лист.",
    thanks: "Дякуємо, що забронювали напряму — це багато означає.",

    subjectReminder: c => `Нагадування: оплата бронювання ${c}`,
    preheaderReminder: d => `Ми тримаємо ваші дати до ${d}.`,
    reminderIntro: d =>
      `оплата ще не надійшла. Ми тримаємо ваші дати до <strong>${d}</strong>; після цього бронювання буде скасовано автоматично.`,
    reminderIfPaid: "Якщо ви сплатили останніми годинами, проігноруйте цей лист — переказ триває певний час.",
  },
};
