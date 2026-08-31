import { Lang } from "@/i18n/translations";

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "cs", label: "CZ", flag: "🇨🇿" },
  { code: "de", label: "DE", flag: "🇩🇪" },
  { code: "sk", label: "SK", flag: "🇸🇰" },
  { code: "uk", label: "UA", flag: "🇺🇦" },
];

export default function LanguageSwitcher({ lang, setLang }: Props) {
  return (
    <div className="flex gap-1">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
            lang === l.code
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          <span>{l.flag}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}
