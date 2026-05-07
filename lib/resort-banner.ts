// Per-country gradient palette used as the background of every resort
// banner (explore cards, compare thumbnails, detail-page hero) until
// per-resort photos are supplied. Colours are drawn from each
// country's national flag so resorts visually group by country.

export const countryGradients: Record<string, string> = {
  // Blue / yellow / red
  Andorra: "linear-gradient(135deg, #10069F 0%, #FECB05 50%, #D52B1E 100%)",
  // Light blue / white / light blue
  Argentina:
    "linear-gradient(135deg, #74ACDF 0%, #F6F6F6 50%, #74ACDF 100%)",
  // Blue / white / red (Union Jack scheme)
  Australia: "linear-gradient(135deg, #00247D 0%, #FFFFFF 50%, #E4002B 100%)",
  // Red / white / red
  Austria: "linear-gradient(135deg, #ED2939 0%, #FFFFFF 50%, #ED2939 100%)",
  // Red / white / red (Maple leaf)
  Canada: "linear-gradient(135deg, #D52B1E 0%, #FFFFFF 50%, #D52B1E 100%)",
  // White / blue / red
  Chile: "linear-gradient(135deg, #FFFFFF 0%, #0033A0 50%, #DA291C 100%)",
  // Blue / white / red (Tricolore)
  France: "linear-gradient(135deg, #002395 0%, #FFFFFF 50%, #ED2939 100%)",
  // White / red (Five-cross flag)
  Georgia: "linear-gradient(135deg, #FFFFFF 0%, #FF0000 100%)",
  // Green / white / red
  Italy: "linear-gradient(135deg, #008C45 0%, #FFFFFF 50%, #CD212A 100%)",
  // White / red (Hinomaru)
  Japan: "linear-gradient(135deg, #FFFFFF 0%, #BC002D 100%)",
  // Blue / red / white (Union Jack + Southern Cross)
  "New Zealand":
    "linear-gradient(135deg, #00247D 0%, #CC142B 50%, #FFFFFF 100%)",
  // Blue / yellow (Nordic cross)
  Sweden: "linear-gradient(135deg, #006AA7 0%, #FECC00 100%)",
  // Red / white (Swiss cross)
  Switzerland: "linear-gradient(135deg, #DA291C 0%, #FFFFFF 100%)",
  // Red / white / blue (Stars and Stripes)
  USA: "linear-gradient(135deg, #B22234 0%, #FFFFFF 50%, #3C3B6E 100%)",
};

export const defaultGradient =
  "linear-gradient(135deg, #0a1e33 0%, #3b9ede 50%, #22d3ee 100%)";

export function gradientForCountry(country: string | null | undefined): string {
  if (!country) return defaultGradient;
  return countryGradients[country] ?? defaultGradient;
}

export function countrySlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}
