import { useState } from "react";
import { analytics, type AnalyticsConsent as Consent } from "../analytics";

export function AnalyticsConsent() {
  const [choice, setChoice] = useState<Consent | null>(() => analytics.getConsent());

  if (!analytics.isConfigured() || choice) return null;

  const choose = (nextChoice: Consent) => {
    analytics.setConsent(nextChoice);
    setChoice(nextChoice);
  };

  return (
    <aside className="analytics-consent" aria-labelledby="analytics-consent-title">
      <div>
        <strong id="analytics-consent-title">Saammeko kerätä nimetöntä käyttötietoa?</strong>
        <p>
          Tieto auttaa löytämään Peluuttimen hankalat kohdat. Pelaajien, joukkueiden tai vastustajien nimiä
          eikä kirjoittamiasi tekstejä lähetetä analytiikkaan.
        </p>
      </div>
      <div className="analytics-consent__actions">
        <button type="button" className="secondary-button" onClick={() => choose("denied")}>Ei kiitos</button>
        <button type="button" className="primary-button" onClick={() => choose("granted")}>Salli käyttötieto</button>
      </div>
    </aside>
  );
}
