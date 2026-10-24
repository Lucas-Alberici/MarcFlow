export const BRAND_NAME = "M7 Connect";
export const BRAND_TAGLINE = "Insta By @eumsml7";
export const BRAND_INSTAGRAM_URL = "https://instagram.com/eumsml7";
export const UPSTREAM_URL = "https://github.com/marcolamaia/MarcFlow";
export const UPSTREAM_ATTRIBUTION = "Baseado no MarcFlow, de Marcos Maia, sob licença MIT.";

export function getBrandName(configuredName?: string | null) {
    return configuredName && configuredName !== "MarcFlow" ? configuredName : BRAND_NAME;
}
