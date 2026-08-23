import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { analytics, type AnalyticsConsent } from "../../analytics";

interface AppSettingsDialogProps {
  theme: "light" | "dark";
  closeLabel?: string;
  onThemeChange: (theme: "light" | "dark") => void;
  onClose: () => void;
}

export function AppSettingsDialog({ theme, closeLabel = "Sulje", onThemeChange, onClose }: AppSettingsDialogProps) {
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent | null>(() => analytics.getConsent());

  const updateAnalyticsConsent = (choice: AnalyticsConsent) => {
    analytics.setConsent(choice);
    setAnalyticsConsent(choice);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-modal app-settings-modal" role="dialog" aria-modal="true" aria-labelledby="app-settings-title">
        <div className="settings-header">
          <div><h2 id="app-settings-title">Asetukset</h2></div>
          <button className="close-button" onClick={onClose}>{closeLabel}</button>
        </div>
        <section className="preference-section">
          <div><span className="eyebrow">ULKOASU</span><h3>Teema</h3><p>Valitse ympäristöön parhaiten sopiva näkymä.</p></div>
          <div className="theme-choice" role="group" aria-label="Väriteema">
            <button className={theme === "light" ? "active" : ""} onClick={() => onThemeChange("light")}><Sun size={18}/>Vaalea</button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => onThemeChange("dark")}><Moon size={18}/>Tumma</button>
          </div>
        </section>
        {analytics.isConfigured() && (
          <section className="preference-section">
            <div>
              <span className="eyebrow">KÄYTTÖANALYTIIKKA</span>
              <h3>Nimetön käyttötieto</h3>
              <p>Auttaa löytämään hankalat käyttökohdat. Nimiä tai kirjoittamiasi tekstejä ei lähetetä.</p>
            </div>
            <div className="theme-choice" role="group" aria-label="Käyttöanalytiikan lupa">
              <button className={analyticsConsent === "granted" ? "active" : ""} onClick={() => updateAnalyticsConsent("granted")}>Sallittu</button>
              <button className={analyticsConsent === "denied" ? "active" : ""} onClick={() => updateAnalyticsConsent("denied")}>Ei sallittu</button>
            </div>
          </section>
        )}
        <section className="preference-section preference-info">
          <div><span className="eyebrow">TIETOSUOJA JA TALLENNUS</span><h3>Tiedot pysyvät tällä laitteella</h3><p>Joukkueet, pelaajat, muodostelmat ja pelihistoria tallennetaan tämän selaimen paikalliseen tallennustilaan. Niitä ei lähetetä Peluuttimen palvelimelle.</p></div>
          <div className="storage-info">
            <section><h3>Pidä tiedot tallessa</h3><p>Selaimen sivustodatan tyhjentäminen tai selaimen poistaminen voi poistaa tallennetut tiedot. Peluutin ei tällä hetkellä tee niistä pilvivarmuuskopiota.</p></section>
            <section><h3>Tietojen poistaminen</h3><p>Voit poistaa yksittäisiä pelejä tai kokonaisen joukkueen Joukkueet-näkymästä. Kaikki tiedot voi poistaa myös tyhjentämällä Peluuttimen sivustodatan selaimen asetuksista.</p></section>
            <section><h3>Pelaajien tiedot</h3><p>Lisää vain pelin seuraamiseen tarvittavat tiedot. Etunimi tai kutsumanimi ja pelinumero riittävät yleensä.</p></section>
          </div>
        </section>
      </section>
    </div>
  );
}
