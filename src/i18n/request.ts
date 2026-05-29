import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

/*
 * i18n SIN routing por URL: el idioma es por usuario (I18N-03).
 * Se lee de la cookie NEXT_LOCALE (sincronizada con users.locale al loguear /
 * al cambiar en Configuración). Default ES (I18N-02).
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
