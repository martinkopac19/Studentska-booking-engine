import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Lang, translations } from "@/i18n/translations";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import backyardBuilding from "@/assets/hero-collage.jpg";
import laundryRoomPhoto from "@/assets/laundry-room.jpg";
import backyardShelterPhoto from "@/assets/backyard-shelter.png";
import InquiryForm from "@/components/InquiryForm";
import {
  MapPin,
  Key,
  ShieldCheck,
  Wifi,
  Utensils,
  Car,
  Train,
  Landmark,
  Phone,
  LogOut,
  HelpCircle,
  Tv,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle,
  Clock,
  Shirt,
  Wind,
  Smartphone,
  Coffee,
  Star,
  AlertTriangle,
  Eye,
  EyeOff,
  Plane,
  Navigation,
  Info,
  Flame,
  ThermometerSnowflake,
  Cross,
  CalendarDays,
  X,
} from "lucide-react";

// Building image – local asset

export default function Index() {
  const [lang, setLang] = useState<Lang>("en");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wifiPasswordVisible, setWifiPasswordVisible] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  const t = (key: string): string => {
    const val = translations[lang][key];
    return typeof val === "string" ? val : key;
  };

  const navSections = [
    { key: "welcome", label: t("nav_welcome"), icon: "🏠" },
    { key: "checkin", label: t("nav_checkin"), icon: "🔑" },
    { key: "rules", label: t("nav_rules"), icon: "📋" },
    { key: "amenities", label: t("nav_amenities"), icon: "🛋️" },
    { key: "wifi", label: t("nav_wifi"), icon: "📶" },
    { key: "parking", label: t("nav_parking"), icon: "🅿️" },
    { key: "food", label: t("nav_food"), icon: "🍽️" },
    { key: "transport", label: t("nav_transport"), icon: "🚇" },
    { key: "sights", label: t("nav_sights"), icon: "🏰" },
    { key: "emergency", label: t("nav_emergency"), icon: "🚨" },
    { key: "checkout", label: t("nav_checkout"), icon: "🚪" },
    { key: "faq", label: t("nav_faq"), icon: "❓" },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  const faqs: { q: string; a: string; image?: string; links?: { label: string; url: string }[] }[] = [
    { q: t("faq_q1"), a: t("faq_a1") },
    { q: t("faq_q2"), a: t("faq_a2") },
    { q: t("faq_q3"), a: t("faq_a3") },
    { q: t("faq_q4"), a: t("faq_a4") },
    { q: t("faq_q5"), a: t("faq_a5") },
    { q: t("faq_q6"), a: t("faq_a6") },
    { q: t("faq_q7"), a: t("faq_a7") },
    { q: t("faq_q8"), a: t("faq_a8"), image: backyardShelterPhoto },
    { q: t("faq_q9"), a: t("faq_a9"), links: [
      { label: `▶ ${t("faq_a9_video")}`, url: "https://youtu.be/r-LTKsL975c" },
      { label: `📄 ${t("faq_a9_manual")}`, url: "https://dwn.alza.cz/manual/145949" },
    ]},
    { q: t("faq_q10"), a: t("faq_a10"), links: [
      { label: `📄 ${t("faq_a10_manual")}`, url: "https://dwn.alza.cz/manual/146250" },
    ]},
    { q: t("faq_q11"), a: t("faq_a11"), links: [
      { label: `📄 ${t("faq_a11_manual")}`, url: "https://dwn.alza.cz/manual/108191" },
    ]},
  ];

  const martinsPicks = {
    food: [
      { name: t("pick_1_name"), desc: t("pick_1_desc"), icon: "🍝", search: "Ristoro+Mucciante+Prague" },
      { name: t("pick_2_name"), desc: t("pick_2_desc"), icon: "🌟", search: "LA+VIE+restaurant+Prague" },
      { name: t("pick_3_name"), desc: t("pick_3_desc"), icon: "🥩", search: "Brasileiro+Restaurant+Prague" },
      { name: t("pick_4_name"), desc: t("pick_4_desc"), icon: "🍺", search: "Restaurace+Červený+jelen+Prague" },
      { name: t("pick_5_name"), desc: t("pick_5_desc"), icon: "🚂", search: "Výtopna+Railway+Restaurant+Prague" },
      { name: t("pick_6_name"), desc: t("pick_6_desc"), icon: "☕", search: "Kavárna+co+hledá+jméno+Prague" },
      { name: t("pick_7_name"), desc: t("pick_7_desc"), icon: "☕", search: "Café+Palanda+Prague" },
    ],
    bars: [
      { name: t("pick_8_name"), desc: t("pick_8_desc"), icon: "🍸", search: "Bukowski's+Bar+Prague" },
      { name: t("pick_9_name"), desc: t("pick_9_desc"), icon: "🌃", search: "Cloud+9+Sky+Bar+Lounge+Prague" },
      { name: t("pick_10_name"), desc: t("pick_10_desc"), icon: "🍻", search: "U+Zlatého+tygra+Prague" },
    ],
    sights: [
      { name: t("pick_11_name"), desc: t("pick_11_desc"), icon: "🌳", search: "Grébovka+Havlíčkovy+sady+Prague" },
      { name: t("pick_12_name"), desc: t("pick_12_desc"), icon: "🌳", search: "Riegrovy+Sady+Prague" },
      { name: t("pick_13_name"), desc: t("pick_13_desc"), icon: "🏰", search: "Vyšehrad+Prague" },
      { name: t("pick_14_name"), desc: t("pick_14_desc"), icon: "⛰️", search: "Petřínské+sady+Prague" },
      { name: t("pick_15_name"), desc: t("pick_15_desc"), icon: "🦁", search: "Prague+Zoo" },
    ],
  };

  const tips = [t("hero_tip_1"), t("hero_tip_2"), t("hero_tip_3"), t("hero_tip_4"), t("hero_tip_5")];

  const checkoutSteps = [
    t("checkout_step_1"), t("checkout_step_2"),
  ];

  const checkinSteps = [
    t("checkin_step_1"), t("checkin_step_2"), t("checkin_step_3"), t("checkin_step_4"),
  ];

  const rules = [
    { icon: "🐾", text: t("rules_no_pets") },
    { icon: "🚬", text: t("rules_no_smoking") },
    { icon: "👥", text: t("rules_max_guests") },
    { icon: "🌙", text: t("rules_quiet_hours") },
    { icon: "🎉", text: t("rules_no_parties") },
    { icon: "👟", text: t("rules_shoes") },
    { icon: "🪟", text: t("rules_windows") },
    { icon: "🤫", text: t("rules_waste") },
    { icon: "⚠️", text: t("rules_damage") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Top Nav */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">🏡</span>
            <span className="font-bold text-primary text-sm sm:text-base truncate">Stylish Studio Prague</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher lang={lang} setLang={setLang} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="Menu"
            >
              <div className="w-5 h-0.5 bg-foreground mb-1 rounded" />
              <div className="w-5 h-0.5 bg-foreground mb-1 rounded" />
              <div className="w-5 h-0.5 bg-foreground rounded" />
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 py-3 grid grid-cols-3 gap-2">
            {navSections.map((s) => (
              <button
                key={s.key}
                onClick={() => scrollTo(s.key)}
                className="text-left text-xs font-medium text-muted-foreground hover:text-primary px-2 py-1.5 rounded hover:bg-muted transition-colors"
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        )}
        <nav className="hidden md:flex max-w-5xl mx-auto px-4 pb-2 gap-1 overflow-x-auto scrollbar-hide">
          {navSections.map((s) => (
            <button
              key={s.key}
              onClick={() => scrollTo(s.key)}
              className="whitespace-nowrap text-xs font-medium text-muted-foreground hover:text-primary px-3 py-1 rounded-full hover:bg-muted transition-colors flex-shrink-0"
            >
              {s.icon} {s.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Hero – Backyard building photo */}
      <section id="welcome" className="relative h-[65vh] min-h-[400px] overflow-hidden">
        <img
          src={backyardBuilding}
          alt="Backyard Dejvice building"
          className="absolute inset-0 w-full h-full object-cover object-center"
          width={1920}
          height={960}
        />
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <div className="inline-flex items-center gap-2 bg-gold/90 text-foreground px-4 py-1.5 rounded-full text-xs font-semibold mb-4 shadow">
            <MapPin size={13} /> {t("hero_address")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-3 drop-shadow-lg">
            {t("hero_title")}
          </h1>
          <p className="text-white/85 text-lg md:text-xl max-w-xl mb-2 drop-shadow">{t("hero_subtitle")}</p>
          <p className="text-white/70 text-sm mb-6 drop-shadow font-medium tracking-wide">BACKYARD DEJVICE</p>
          <button
            onClick={() => setInquiryOpen(true)}
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold/90 text-foreground font-bold px-6 py-3 rounded-full shadow-lg transition-all hover:scale-105 text-sm"
          >
            <CalendarDays size={15} /> {t("hero_airbnb")}
          </button>
        </div>
      </section>

      {/* Welcome text + Tips */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
            <p className="text-muted-foreground leading-relaxed text-sm">{t("hero_welcome_text")}</p>
          </div>
          <div className="bg-primary rounded-2xl p-6 text-primary-foreground">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2">
              <Coffee size={16} /> {t("hero_tip_title")}
            </h3>
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className="text-sm text-primary-foreground/90 flex gap-2">
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 pb-16 space-y-8">

        {/* Address & Map */}
        <section id="checkin" className="scroll-mt-24">
          <SectionHeader icon={<MapPin size={18} />} title={t("address_title")} />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-card">
              <p className="font-bold text-base mb-1">{t("address_full")}</p>
              <p className="text-sm text-muted-foreground mb-3">{t("address_desc")}</p>
              <p className="text-sm text-muted-foreground mb-4 flex items-start gap-2">
                <Info size={14} className="mt-0.5 shrink-0 text-primary" />
                {t("address_directions")}
              </p>
              <a
                href="https://www.openstreetmap.org/?mlat=50.10078&mlon=14.38928&zoom=17"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
              >
                <MapPin size={14} /> {t("address_map")}
              </a>
            </div>
            {/* OpenStreetMap embed */}
            <div className="rounded-2xl overflow-hidden border border-border shadow-card h-56 md:h-auto min-h-[220px]">
              <iframe
                title="OpenStreetMap"
                width="100%"
                height="100%"
                style={{ border: 0, display: "block", minHeight: "220px" }}
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=14.38428%2C50.09878%2C14.39428%2C50.10278&layer=mapnik&marker=50.10078%2C14.38928"
              />
            </div>
          </div>

          {/* Check-in info */}
          <div className="mt-4 bg-card rounded-2xl p-6 border border-border shadow-card">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary">
              <Key size={18} /> {t("checkin_title")}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-3 bg-gold/10 rounded-xl p-4 border border-gold/20">
                <Clock size={20} className="shrink-0" style={{ color: "hsl(var(--gold))" }} />
                <div>
                  <p className="font-semibold text-sm">{t("checkin_time")}</p>
                  <p className="text-xs text-muted-foreground">{t("checkin_early")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-secondary rounded-xl p-4 border border-border">
                <Clock size={20} className="text-muted-foreground shrink-0" />
                <p className="font-semibold text-sm">{t("checkout_time")}</p>
              </div>
            </div>
            <div className="bg-muted rounded-xl p-4 border border-border">
              <p className="font-semibold text-sm mb-1 flex items-center gap-2">
                <Key size={14} /> {t("checkin_lockbox_title")}
              </p>
              <p className="text-sm text-muted-foreground mb-3">{t("checkin_lockbox_desc")}</p>
              <ol className="space-y-2">
                {checkinSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* House Rules */}
        <section id="rules" className="scroll-mt-24">
          <SectionHeader icon={<ShieldCheck size={18} />} title={t("rules_title")} />
          <div className="bg-card rounded-2xl p-6 border border-border shadow-card">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rules.map((r, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3 text-sm">
                  <span className="text-lg">{r.icon}</span>
                  <span>{r.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Amenities */}
        <section id="amenities" className="scroll-mt-24">
          <SectionHeader icon={<Utensils size={18} />} title={t("amenities_title")} />

          {/* Backyard & BBQ */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-card mb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-xl border border-green-200 shrink-0">
                <span className="text-2xl">🌳</span>
              </div>
              <div>
                <p className="font-bold text-sm mb-1">{t("backyard_title")}</p>
                <p className="text-sm text-muted-foreground mb-2">{t("backyard_desc")}</p>
                <p className="text-sm text-muted-foreground">{t("backyard_bbq")}</p>
              </div>
            </div>
          </div>

          {/* Free food & drinks */}
          <div className="bg-gold/10 border border-gold/20 rounded-xl px-5 py-3 text-sm text-foreground mb-4">
            🍽️ {t("free_food")}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AmenityCard icon={<Utensils size={20} />} title={t("amenities_kitchen_title")} desc={t("amenities_kitchen_desc")} />
            <AmenityCard icon={<Coffee size={20} />} title={t("amenities_moka_title")} desc={t("amenities_moka_desc")} />
            <AmenityCard icon={<Shirt size={20} />} title={t("amenities_washer_title")} desc={t("amenities_washer_desc")} />
            <AmenityCard icon={<CheckCircle size={20} />} title={t("amenities_towels_title")} desc={t("amenities_towels_desc")} />
            <AmenityCard icon={<CheckCircle size={20} />} title={t("amenities_iron_title")} desc={t("amenities_iron_desc")} />
            <AmenityCard icon={<Wind size={20} />} title={t("amenities_hairdryer_title")} desc={t("amenities_hairdryer_desc")} />
            <AmenityCard icon={<ThermometerSnowflake size={20} />} title={t("amenities_ac_title")} desc={t("amenities_ac_desc")} />
            <AmenityCard icon={<Flame size={20} />} title={t("amenities_extinguisher_title")} desc={t("amenities_extinguisher_desc")} />
            <AmenityCard icon={<Cross size={20} />} title={t("amenities_firstaid_title")} desc={t("amenities_firstaid_desc")} />

            {/* WiFi card with password reveal — also the #wifi anchor target */}
            <div id="wifi" className="scroll-mt-24 bg-primary text-primary-foreground rounded-2xl p-5 border border-border shadow-card card-hover">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-primary-foreground/10 rounded-lg">
                  <Wifi size={20} />
                </div>
                <h4 className="font-bold text-sm">{t("wifi_title")}</h4>
              </div>
              {!wifiPasswordVisible ? (
                <button
                  onClick={() => setWifiPasswordVisible(true)}
                  className="flex items-center justify-center gap-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 border border-primary-foreground/20 rounded-lg px-3 py-2 text-xs font-semibold transition-colors w-full"
                >
                  <Eye size={13} /> {t("wifi_pass_reveal")}
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setWifiPasswordVisible(false)}
                    className="flex items-center justify-center gap-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 border border-primary-foreground/20 rounded-lg px-3 py-2 text-xs font-semibold transition-colors w-full"
                  >
                    <EyeOff size={13} /> {t("wifi_pass_hide")}
                  </button>
                  <div>
                    <p className="text-xs text-primary-foreground/70 mb-1">{t("wifi_network")}</p>
                    <p className="font-mono font-bold text-sm mb-2">{t("wifi_ssid_value")}</p>
                    <p className="text-xs text-primary-foreground/70 mb-1">{t("wifi_password")}</p>
                    <p className="font-mono font-bold text-sm break-all">{t("wifi_pass_value")}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-white p-3 rounded-xl">
                      <QRCodeSVG
                        value={`WIFI:T:WPA;S:${t("wifi_ssid_value")};P:${t("wifi_pass_value")};;`}
                        size={120}
                        level="M"
                      />
                    </div>
                    <p className="text-[10px] text-primary-foreground/60 text-center">{t("wifi_qr_hint")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Netflix / Smart TV */}
          <div className="mt-4 bg-card rounded-2xl p-5 border border-border shadow-card flex items-start gap-4">
            <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 shrink-0">
              <Tv size={22} className="text-destructive" />
            </div>
            <div className="w-full">
              <p className="font-bold text-sm mb-2">{t("netflix_title")}</p>
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-3">
                <p className="text-sm font-semibold text-primary">📺 {t("netflix_orange")}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t("netflix_desc")}</p>
              <span className="inline-block mt-2 text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1 rounded-full">
                ℹ️ {t("netflix_profile")}
              </span>
            </div>
          </div>

          {/* Laundry Room */}
          <div className="mt-4 bg-card rounded-2xl p-5 border border-border shadow-card">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shrink-0">
                <Shirt size={22} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm mb-1">{t("laundry_title")}</p>
                <p className="text-xs text-muted-foreground">{t("laundry_location")}</p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden mb-4 border border-border">
              <img src={laundryRoomPhoto} alt="Laundry room" className="w-full" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
                <span className="text-base shrink-0">🔑</span>
                <p className="text-xs text-muted-foreground">{t("laundry_access")}</p>
              </div>
              <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
                <Shirt size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{t("laundry_machines")}</p>
              </div>
              <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3 sm:col-span-2">
                <span className="text-base shrink-0">🪙</span>
                <p className="text-xs text-muted-foreground font-semibold">{t("laundry_coins")}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">{t("laundry_tip")}</p>
            <p className="text-xs text-destructive font-medium">{t("laundry_no_powder")}</p>
          </div>

          {/* Safety info */}
          <div className="mt-4 bg-card rounded-2xl p-5 border border-border shadow-card">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 shrink-0">
                <AlertTriangle size={22} className="text-destructive" />
              </div>
              <div>
                <p className="font-bold text-sm mb-1">{t("safety_title")}</p>
                <p className="text-sm text-muted-foreground mb-1">{t("safety_extinguisher")}</p>
                <p className="text-sm text-muted-foreground">{t("safety_firstaid")}</p>
              </div>
            </div>
          </div>

          {/* Houseplants warning */}
          <div className="mt-4 bg-card rounded-2xl p-5 border border-border shadow-card">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 shrink-0">
                <AlertTriangle size={22} className="text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-sm mb-1">{t("plants_title")}</p>
                <p className="text-sm text-muted-foreground mb-2">{t("plants_warning")}</p>
                <p className="text-xs text-muted-foreground">{t("plants_details")}</p>
              </div>
            </div>
          </div>

          {/* Waste disposal */}
          <div className="mt-4 bg-card rounded-2xl p-5 border border-border shadow-card">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-muted rounded-xl border border-border shrink-0">
                <span className="text-2xl">🗑️</span>
              </div>
              <div>
                <p className="font-bold text-sm mb-1">{t("waste_title")}</p>
                <p className="text-sm text-muted-foreground">{t("waste_desc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Parking */}
        <section id="parking" className="scroll-mt-24">
          <SectionHeader icon={<Car size={18} />} title={t("parking_title")} />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-card rounded-2xl p-5 border-l-4 border-orange-400 shadow-card">
              <div className="text-2xl mb-2">🅿️</div>
              <h4 className="font-bold text-sm mb-2">{t("parking_zone_title")}</h4>
              <p className="text-xs text-muted-foreground mb-3">{t("parking_zone_desc")}</p>
              <p className="text-xs text-muted-foreground mb-2">{t("parking_zone_map")}</p>
              <a
                href="https://parking.praha.eu/en/map/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ExternalLink size={12} /> {t("parking_zone_map_link")}
              </a>
            </div>
            <InfoBlock icon="🆓" title={t("parking_public_title")} desc={t("parking_public_desc")} accentColor="green" />
            <div className="bg-card rounded-2xl p-5 border border-border shadow-card card-hover">
              <div className="text-2xl mb-2">📱</div>
              <h4 className="font-bold text-sm mb-2">{t("parking_app_title")}</h4>
              <p className="text-xs text-muted-foreground mb-3">{t("parking_app_desc")}</p>
              <a
                href="https://www.parkujvklidu.cz/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ExternalLink size={12} /> {t("parking_app_link")}
              </a>
            </div>
          </div>

          {/* NTK Garage card */}
          <div className="mt-4 bg-card rounded-2xl p-5 border border-border shadow-card">
            <div className="flex items-start gap-4">
              <div className="text-3xl shrink-0">🏗️</div>
              <div className="flex-1">
                <p className="font-bold text-sm mb-1">{t("parking_garage_title")}</p>
                <p className="text-xs text-muted-foreground mb-3">{t("parking_garage_desc")}</p>
                <a
                  href="https://www.aprecoparking.cz/en/prague-6-garaze-dejvice-pod-ntk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <ExternalLink size={12} /> {t("parking_garage_link")}
                </a>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-gold/10 border border-gold/20 rounded-xl px-5 py-3 text-sm text-foreground">
            {t("parking_tip")}
          </div>
        </section>

        {/* Martin's Recommended Places */}
        <section id="food" className="scroll-mt-24">
          <SectionHeader icon={<Coffee size={18} />} title={t("restaurants_title")} />
          
          {/* Google Maps list CTA */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-5">
            <p className="text-sm text-muted-foreground mb-3">{t("martins_list_desc")}</p>
            <a
              href="https://www.google.com/maps/@/data=!3m1!4b1!4m3!11m2!2s8P7it7xoce4GAx9VH2l5jtonWSfcAw!3e3?entry=tts&skid=a9598497-b091-4003-b7b6-4815abe6d2a3"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <MapPin size={15} /> {t("martins_list_btn")} <ExternalLink size={12} />
            </a>
          </div>

          {/* Food */}
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">🍽️ {t("martins_category_food")}</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {martinsPicks.food.map((r, i) => (
              <RestaurantCard key={i} name={r.name} desc={r.desc} icon={r.icon} url={`https://www.google.com/search?q=${r.search}`} />
            ))}
          </div>

          {/* Bars */}
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">🍸 {t("martins_category_bars")}</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {martinsPicks.bars.map((r, i) => (
              <RestaurantCard key={i} name={r.name} desc={r.desc} icon={r.icon} url={`https://www.google.com/search?q=${r.search}`} />
            ))}
          </div>

          {/* Sights */}
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">🏛️ {t("martins_category_sights")}</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {martinsPicks.sights.map((r, i) => (
              <RestaurantCard key={i} name={r.name} desc={r.desc} icon={r.icon} url={`https://www.google.com/search?q=${r.search}`} />
            ))}
          </div>

          {/* Supermarkets */}
          <div className="mt-6">
            <h4 className="font-bold text-base mb-3 flex items-center gap-2">
              <ShoppingCart size={16} /> {t("supermarkets_title")}
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <a href="https://maps.app.goo.gl/CU4dTdPwvNX1ziMz9" target="_blank" rel="noopener noreferrer" className="bg-card rounded-2xl p-5 border border-border shadow-card hover:border-primary/40 transition-colors cursor-pointer block">
                <p className="font-bold text-sm mb-1">🛒 {t("supermarket_sachr_name")}</p>
                <p className="text-xs text-muted-foreground">{t("supermarket_sachr_desc")}</p>
              </a>
              <a href="https://maps.app.goo.gl/mCyM8b14Ym7aw5eDA" target="_blank" rel="noopener noreferrer" className="bg-card rounded-2xl p-5 border border-border shadow-card hover:border-primary/40 transition-colors cursor-pointer block">
                <p className="font-bold text-sm mb-1">🛒 {t("supermarket_billa_name")}</p>
                <p className="text-xs text-muted-foreground">{t("supermarket_billa_desc")}</p>
              </a>
              <a href="https://maps.app.goo.gl/zPSzbzB5AGK1JXL39" target="_blank" rel="noopener noreferrer" className="bg-card rounded-2xl p-5 border border-border shadow-card hover:border-primary/40 transition-colors cursor-pointer block">
                <p className="font-bold text-sm mb-1">🛒 {t("supermarket_albert1_name")}</p>
                <p className="text-xs text-muted-foreground mb-1">{t("supermarket_albert1_desc")}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={11} /> {t("supermarket_albert1_address")}
                </p>
              </a>
              <a href="https://maps.app.goo.gl/NV5ww9oxTTDPa2Wa6" target="_blank" rel="noopener noreferrer" className="bg-card rounded-2xl p-5 border border-border shadow-card hover:border-primary/40 transition-colors cursor-pointer block">
                <p className="font-bold text-sm mb-1">🛒 {t("supermarket_albert2_name")}</p>
                <p className="text-xs text-muted-foreground mb-1">{t("supermarket_albert2_desc")}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={11} /> {t("supermarket_albert2_address")}
                </p>
              </a>
            </div>
          </div>
        </section>

        {/* Transport */}
        <section id="transport" className="scroll-mt-24">
          <SectionHeader icon={<Train size={18} />} title={t("transport_title")} />

          {/* How Prague transit works */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-card mb-4">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-primary">
              <Info size={15} /> {t("transport_general_title")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">{t("transport_general_desc")}</p>
            <div className="bg-muted rounded-xl p-3">
              <p className="font-semibold text-xs mb-0.5">{t("transport_apps_title")}</p>
              <p className="text-xs text-muted-foreground">{t("transport_apps_desc")}</p>
            </div>
          </div>

          {/* Metro / Tram / Bus */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <TransportCard icon="🚇" color="bg-red-50 border-red-100" title={t("transport_metro_title")} desc={t("transport_metro_desc")} />
            <TransportCard icon="🚊" color="bg-yellow-50 border-yellow-100" title={t("transport_tram_title")} desc={t("transport_tram_desc")} />
            <TransportCard icon="🚌" color="bg-blue-50 border-blue-100" title={t("transport_bus_title")} desc={t("transport_bus_desc")} />
          </div>

          {/* Tickets + app */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-card flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-3 p-3 bg-primary rounded-xl shrink-0">
              <Smartphone size={20} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm">{t("transport_app")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("transport_tickets")}</p>
              <p className="text-xs font-semibold mt-1 text-primary">{t("transport_24h")}</p>
            </div>
          </div>

          {/* Getting here section */}
          <SectionHeader icon={<Navigation size={18} />} title={t("arrivals_title")} />

          {/* Airport */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-card mb-3">
            <p className="font-bold text-sm mb-2">{t("arrivals_airport_title")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("arrivals_airport_desc")}</p>
          </div>

          {/* Train stations */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-card mb-3">
            <p className="font-bold text-sm mb-3">{t("arrivals_train_title")}</p>
            <div className="space-y-2">
              {[t("arrivals_train_hlavni"), t("arrivals_train_masaryk"), t("arrivals_train_holesov")].map((route, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary font-bold mt-0.5 shrink-0">→</span>
                  <span>{route}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By car */}
          <div className="bg-card rounded-2xl p-5 border border-border shadow-card">
            <p className="font-bold text-sm mb-2">{t("arrivals_car_title")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("arrivals_car_desc")}</p>
          </div>
        </section>

        {/* Sights */}
        <section id="sights" className="scroll-mt-24">
          <SectionHeader icon={<Landmark size={18} />} title={t("sights_title")} />
          <div className="grid sm:grid-cols-2 gap-4">
            <SightCard icon="🏰" name={t("sight_castle_name")} desc={t("sight_castle_desc")} />
            <SightCard icon="⛪" name={t("sight_hradcany_name")} desc={t("sight_hradcany_desc")} />
            <SightCard icon="📚" name={t("sight_strahov_name")} desc={t("sight_strahov_desc")} />
            <SightCard icon="🌿" name={t("sight_sarka_name")} desc={t("sight_sarka_desc")} />
            <SightCard icon="🏛️" name={t("sight_vitezne_name")} desc={t("sight_vitezne_desc")} />
          </div>
        </section>

        {/* Emergency */}
        <section id="emergency" className="scroll-mt-24">
          <SectionHeader icon={<Phone size={18} />} title={t("emergency_title")} />
          <div className="grid gap-4">
            <div className="bg-destructive/5 rounded-2xl p-5 border border-destructive/20 shadow-card">
              <p className="font-bold text-sm mb-3 flex items-center gap-2 text-destructive">
                <AlertTriangle size={14} /> {t("emergency_title")}
              </p>
              <div className="space-y-2">
                {[
                  { label: t("emergency_police"), icon: "👮" },
                  { label: t("emergency_ambulance"), icon: "🚑" },
                  { label: t("emergency_fire"), icon: "🚒" },
                  { label: t("emergency_eu"), icon: "🆘" },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-semibold">
                    <span>{e.icon}</span> {e.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 bg-card rounded-xl p-4 border border-border">
            <p className="font-bold text-sm mb-2">💊 {t("emergency_pharmacy_title")}</p>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{t("emergency_pharmacy_1")}</p>
              <p className="text-xs text-muted-foreground">{t("emergency_pharmacy_2")}</p>
              <p className="text-xs text-muted-foreground">{t("emergency_pharmacy_3")}</p>
            </div>
          </div>
        </section>

        {/* Check-out */}
        <section id="checkout" className="scroll-mt-24">
          <SectionHeader icon={<LogOut size={18} />} title={t("checkout_title")} />
          <div className="bg-card rounded-2xl p-6 border border-border shadow-card">
            <div className="inline-flex items-center gap-2 bg-gold/10 text-foreground border border-gold/20 px-4 py-2 rounded-full text-sm font-bold mb-5">
              <Clock size={14} /> {t("checkout_time_note")}
            </div>
            <ol className="space-y-3">
              {checkoutSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 bg-muted rounded-xl px-5 py-4 text-sm text-center font-semibold text-foreground">
              {t("checkout_reviews")}
            </div>
            <div className="mt-3 bg-muted rounded-xl px-5 py-4 text-sm text-center font-semibold text-foreground">
              {t("checkout_thanks")}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24">
          <SectionHeader icon={<HelpCircle size={18} />} title={t("faq_title")} />
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-border last:border-0">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
                >
                  <span className="font-semibold text-sm">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp size={16} className="text-muted-foreground shrink-0 ml-2" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground shrink-0 ml-2" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                    {faq.links && (
                      <div className="mt-3 flex flex-col gap-2">
                        {faq.links.map((link, j) => (
                          <a key={j} href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                            {link.label}
                          </a>
                        ))}
                      </div>
                    )}
                    {faq.image && (
                      <img src={faq.image} alt="Backyard shelter" className="mt-3 rounded-xl border border-border w-full" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card text-center py-6 px-4">
        <p className="text-sm text-muted-foreground">{t("footer_text")}</p>
      </footer>

      {/* Inquiry Modal */}
      {inquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setInquiryOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-foreground mb-4">{t("inquiry_title")}</h2>
            <InquiryForm t={t} onClose={() => setInquiryOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-primary text-primary-foreground rounded-lg">{icon}</div>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
}

function AmenityCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-card card-hover">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-muted rounded-lg text-primary">{icon}</div>
        <h4 className="font-bold text-sm">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function InfoBlock({ icon, title, desc, accentColor }: { icon: string; title: string; desc: string; accentColor?: string }) {
  const bgMap: Record<string, string> = { orange: "bg-secondary border-border", green: "bg-muted border-border" };
  const bg = bgMap[accentColor ?? ""] ?? "bg-muted border-border";
  return (
    <div className={`rounded-2xl p-5 border shadow-card card-hover ${bg}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-bold text-sm mb-2">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function RestaurantCard({ name, desc, icon, url, featured }: { name: string; desc: string; icon: string; url: string; featured?: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-2xl p-5 border shadow-card card-hover transition-all ${featured ? "bg-primary text-primary-foreground border-primary/20" : "bg-card border-border"}`}
    >
      <div className="text-xl mb-2">{icon}</div>
      <p className={`font-bold text-sm mb-1 flex items-center gap-1 ${featured ? "text-primary-foreground" : ""}`}>
        {name} <ExternalLink size={11} className="opacity-50" />
      </p>
      <p className={`text-xs leading-relaxed ${featured ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{desc}</p>
    </a>
  );
}

function TransportCard({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 border shadow-card card-hover ${color}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <p className="font-bold text-sm mb-1">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function SightCard({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-card card-hover flex items-start gap-4">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="font-bold text-sm mb-1">{name}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
