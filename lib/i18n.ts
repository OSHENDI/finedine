// Customer-facing text. Arabic and English are separate experiences: the whole screen is in one
// language at a time and the customer switches with one button. Names that come from the venue's
// own data (items, categories, payment methods) use the Arabic field when it is filled in and
// fall back to the English one, so a half-translated menu still works.
export type Lang = "en" | "ar";

export const langCookie = "fd_lang";

export function parseLang(value: string | undefined | null): Lang | null {
  return value === "en" || value === "ar" ? value : null;
}

// Arabic is the default. A saved choice (cookie) wins; the browser's language list is not used.
export function pickInitialLang(saved: string | undefined): Lang {
  return parseLang(saved) ?? "ar";
}

export function localized(lang: Lang, en: string, ar: string | null | undefined) {
  return lang === "ar" && ar?.trim() ? ar : en;
}

// Digits are always Latin (0-9), in both languages, as the owner asked.
export function numberFormat(lang?: Lang) {
  void lang;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
}

// Order numbers are labels, not quantities: "#1001", never "#1,001".
export function plainNumber(_lang: Lang, value: number) {
  return new Intl.NumberFormat("en-US", { useGrouping: false }).format(value);
}

// Shekel: "29 شيكل" in Arabic, "ILS 29" in English.
export function formatPrice(cents: number, currency: string, lang: Lang) {
  const value = cents / 100;
  const digits = Number.isInteger(value) ? { minimumFractionDigits: 0 } : { minimumFractionDigits: 2 };
  const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, ...digits }).format(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  if (currency === "ILS") return lang === "ar" ? `${sign}${amount} شيكل` : `${sign}ILS ${amount}`;
  return `${sign}${currency} ${amount}`;
}

// "Table 12" is stored in one language; show it in the language of the screen.
export function localizeTable(label: string, lang: Lang) {
  const match = /^(?:table|t)\s*(\d+)$/i.exec(label.trim());
  if (!match) return label;
  return lang === "ar" ? `طاولة ${match[1]}` : `Table ${match[1]}`;
}

export function itemCount(count: number, lang: Lang) {
  const n = numberFormat(lang).format(count);
  if (lang === "en") return `${n} ${count === 1 ? "item" : "items"}`;
  if (count === 1) return "صنف واحد";
  if (count === 2) return "صنفان";
  return `${n} ${count <= 10 ? "أصناف" : "صنفاً"}`;
}

const dictionary = {
  en: {
    switchTo: "عربي",
    switchLabel: "Switch to Arabic",
    home: "Home",
    all: "All",
    categories: "Menu categories",
    add: "Add",
    soldOut: "Sold out",
    closedLabel: "Not taking orders",
    closed: "We are not taking orders right now. You can still browse the menu.",
    viewOrder: "View order",
    cart: "Order",
    activeOrder: "Your order is in progress",
    track: "Track order",
    sizes: "Size",
    extras: "Extras",
    quantity: "Quantity",
    close: "Close",
    back: "Back",
    yourCart: "Your order",
    clear: "Clear",
    kitchenNotes: "Notes for the kitchen (allergies, extra napkins...)",
    nameInvalid: "Enter your name, at least 3 letters.",
    phoneInvalid: "Enter a mobile number: 10 digits starting with 05.",
    addExtra: "Add",
    addedExtra: "Added",
    inOrder: "In your order",
    swipeHint: "Swipe to browse",
    homeTitle: "What are you craving?",
    showDetails: "Show details",
    hideDetails: "Hide details",
    paidWith: "Payment",
    yourNote: "Your note",
    total: "Total",
    continuePay: "Continue to payment",
    emptyCart: "Your order is empty",
    backToMenu: "Back to the menu",
    remove: "Remove",
    increase: "Increase quantity",
    decrease: "Decrease quantity",
    completeOrder: "Payment",
    yourName: "Your name",
    payment: "Payment method",
    accountHolder: "Account holder",
    copy: "Copy number",
    copied: "Copied",
    transferPhone: "Mobile number you paid from",
    transferRef: "Operation number (optional)",
    receipt: "Or a photo of the receipt",
    refInvalid: "Operation numbers are 8 or 9 digits.",
    proofNeeded: "Add the operation number or a photo of the receipt.",
    chooseReceipt: "Choose a photo",
    changeReceipt: "Change photo",
    noPayment: "No payment method is set up yet. Please ask the staff.",
    notFoundOrder: "We cannot find this order. Check the link or ask the staff.",
    emptyCategory: "No items in this section yet.",
    confirm: "Confirm order",
    sending: "Sending...",
    orderNumber: "Order",
    noConnection: "No connection. Check your network and try again.",
    couldNotSend: "Could not send the order. Try again.",
    reconnecting: "Connection lost. Retrying...",
    status: {
      confirmed: "Received",
      accepted: "Accepted",
      preparing: "Preparing",
      ready: "Ready",
      done: "Done"
    },
    statusHelp: {
      confirmed: "We have your order.",
      accepted: "The kitchen has your order.",
      preparing: "Your order is being made.",
      ready: "Waiting for you.",
      done: "Handed over."
    },
    headline: {
      checking: "We are checking your payment",
      received: "Order received",
      accepted: "Your order was accepted",
      preparing: "We are preparing your order",
      ready: "Your order is ready",
      done: "Enjoy! Your order was handed over.",
      cancelled: "Your order was cancelled"
    },
    readyTable: "We are bringing it to {table}.",
    readyName: "Collect it at the counter under the name {name}.",
    cancelledHelp: "Please talk to the staff or place a new order.",
    errors: {
      "Branch unavailable": "This venue is not taking orders right now.",
      "Item unavailable": "An item in your order just sold out. Remove it and try again.",
      "Invalid option": "An option in your order is no longer available. Remove the item and add it again.",
      "Invalid payment method": "This payment method is not available. Choose another one.",
      "Transfer details required": "Enter the phone you paid from and the transfer reference.",
      "Payment proof required": "Add the operation number or a photo of the receipt.",
      "Invalid receipt image": "Use a JPEG, PNG or WebP photo under 5 MB.",
      "This receipt or reference was already used": "This receipt or reference was already used for another order.",
      "Too many order attempts": "Too many attempts. Wait a minute and try again.",
      "Invalid order": "Check your details and try again."
    } as Record<string, string>
  },
  ar: {
    switchTo: "English",
    switchLabel: "التبديل إلى الإنجليزية",
    home: "الرئيسية",
    all: "الكل",
    categories: "أقسام القائمة",
    add: "أضف",
    soldOut: "نفد",
    closedLabel: "الطلبات متوقفة",
    closed: "الطلبات متوقفة الآن، لكن يمكنك تصفّح القائمة.",
    viewOrder: "عرض الطلب",
    cart: "الطلب",
    activeOrder: "طلبك قيد التنفيذ",
    track: "تتبّع الطلب",
    sizes: "الحجم",
    extras: "إضافات",
    quantity: "الكمية",
    close: "إغلاق",
    back: "رجوع",
    yourCart: "طلبك",
    clear: "مسح",
    kitchenNotes: "ملاحظات للمطبخ (حساسية، مناديل إضافية...)",
    nameInvalid: "أدخل اسمك، 3 أحرف على الأقل.",
    phoneInvalid: "أدخل رقم جوال من 10 أرقام يبدأ بـ 05.",
    addExtra: "إضافة",
    addedExtra: "تمت الإضافة",
    inOrder: "في طلبك",
    swipeHint: "اسحب للتنقل",
    homeTitle: "ماذا تشتهي اليوم؟",
    showDetails: "عرض التفاصيل",
    hideDetails: "إخفاء التفاصيل",
    paidWith: "الدفع",
    yourNote: "ملاحظتك",
    total: "الإجمالي",
    continuePay: "متابعة إلى الدفع",
    emptyCart: "لم تضف شيئاً إلى طلبك بعد",
    backToMenu: "العودة إلى القائمة",
    remove: "حذف",
    increase: "زيادة الكمية",
    decrease: "إنقاص الكمية",
    completeOrder: "إتمام الدفع",
    yourName: "اسمك",
    payment: "طريقة الدفع",
    accountHolder: "اسم صاحب الحساب",
    copy: "نسخ الرقم",
    copied: "تم النسخ",
    transferPhone: "رقم الجوال الذي حوّلت منه",
    transferRef: "رقم العملية (اختياري)",
    receipt: "أو صورة الإشعار",
    refInvalid: "رقم العملية من 8 إلى 9 أرقام.",
    proofNeeded: "أضف رقم العملية أو صورة الإشعار.",
    chooseReceipt: "اختر صورة",
    changeReceipt: "تغيير الصورة",
    noPayment: "لم تُضبط طريقة دفع بعد. اسأل أحد الموظفين.",
    notFoundOrder: "لا نجد هذا الطلب. تحقق من الرابط أو اسأل أحد الموظفين.",
    emptyCategory: "لا توجد أصناف في هذا القسم بعد.",
    confirm: "تأكيد الطلب",
    sending: "جارٍ الإرسال...",
    orderNumber: "الطلب",
    noConnection: "لا يوجد اتصال. تحقق من الشبكة وحاول مرة أخرى.",
    couldNotSend: "تعذر إرسال الطلب. حاول مرة أخرى.",
    reconnecting: "انقطع الاتصال. نعيد المحاولة...",
    status: {
      confirmed: "تم الاستلام",
      accepted: "تم القبول",
      preparing: "قيد التحضير",
      ready: "جاهز",
      done: "تم التسليم"
    },
    statusHelp: {
      confirmed: "وصلنا طلبك.",
      accepted: "المطبخ استلم طلبك.",
      preparing: "نجهّز طلبك الآن.",
      ready: "بانتظارك.",
      done: "تم تسليم الطلب."
    },
    headline: {
      checking: "نتحقق من الدفع الآن",
      received: "تم استلام طلبك",
      accepted: "تم قبول طلبك",
      preparing: "نقوم بتحضير طلبك",
      ready: "طلبك جاهز",
      done: "بالهناء! تم تسليم طلبك.",
      cancelled: "تم إلغاء طلبك"
    },
    readyTable: "سنحضره إلى {table}.",
    readyName: "استلمه من الكاونتر باسم {name}.",
    cancelledHelp: "يرجى التحدث مع الموظفين أو إرسال طلب جديد.",
    errors: {
      "Branch unavailable": "المكان لا يستقبل الطلبات الآن.",
      "Item unavailable": "نفد أحد الأصناف في طلبك. احذفه وحاول مرة أخرى.",
      "Invalid option": "أحد الخيارات في طلبك لم يعد متاحاً. احذف الصنف وأضفه من جديد.",
      "Invalid payment method": "طريقة الدفع هذه غير متاحة. اختر طريقة أخرى.",
      "Transfer details required": "أدخل رقم الجوال الذي حوّلت منه ورقم العملية.",
      "Payment proof required": "أضف رقم العملية أو صورة الإشعار.",
      "Invalid receipt image": "استخدم صورة JPEG أو PNG أو WebP بحجم أقل من 5 ميغابايت.",
      "This receipt or reference was already used": "هذا الإيصال أو رقم العملية استُخدم في طلب آخر.",
      "Too many order attempts": "محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.",
      "Invalid order": "تحقق من بياناتك وحاول مرة أخرى."
    } as Record<string, string>
  }
};

export type Dictionary = (typeof dictionary)["en"];

export function text(lang: Lang): Dictionary {
  return dictionary[lang];
}

export function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}
