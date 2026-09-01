import { useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { analytics, type AnalyticsConsent } from "../../analytics";
import { createBackup, formatFileSize, getBackupSizeBytes, parseBackup, serializeBackup, type PeluutinBackup } from "../../data/backup";
import type { ActiveMatch, Formation, ScheduledMatch, Team } from "../../types";

interface AppSettingsDialogProps {
  theme: "light" | "dark";
  teams: Team[];
  scheduledMatches: ScheduledMatch[];
  activeMatch: ActiveMatch | null;
  defaultFormations: Formation[];
  closeLabel?: string;
  onThemeChange: (theme: "light" | "dark") => void;
  onRestoreBackup: (backup: PeluutinBackup) => void;
  onClose: () => void;
}

export function AppSettingsDialog({ theme, teams, scheduledMatches, activeMatch, defaultFormations, closeLabel = "Sulje", onThemeChange, onRestoreBackup, onClose }: AppSettingsDialogProps) {
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent | null>(() => analytics.getConsent());
  const [backupStatus, setBackupStatus] = useState("");
  const backup = useMemo(() => createBackup(teams, scheduledMatches, activeMatch), [teams, scheduledMatches, activeMatch]);
  const backupText = useMemo(() => serializeBackup(backup), [backup]);
  const backupSize = useMemo(() => getBackupSizeBytes(backup), [backup]);

  const updateAnalyticsConsent = (choice: AnalyticsConsent) => {
    analytics.setConsent(choice);
    setAnalyticsConsent(choice);
  };

  const exportBackup = () => {
    const blob = new Blob([backupText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `peluutin-varmuuskopio-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupStatus(`Varmuuskopio ladattu · ${formatFileSize(blob.size)}`);
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const nextBackup = parseBackup(await file.text(), defaultFormations);
      if (!window.confirm("Palautetaanko tämä varmuuskopio? Nykyiset tämän laitteen tiedot korvataan.")) return;
      onRestoreBackup(nextBackup);
      setBackupStatus(`Varmuuskopio palautettu · ${formatFileSize(file.size)}`);
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : "Varmuuskopion lukeminen epäonnistui.");
    }
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
        <section className="preference-section">
          <div>
            <span className="eyebrow">VARMUUSKOPIO</span>
            <h3>Pidä tiedot tallessa</h3>
            <p>Vie joukkueet, pelaajat, muodostelmat, pelihistorian ja tulevat pelit yhteen JSON-tiedostoon. Tiedosto jää omalle laitteellesi.</p>
          </div>
          <div className="backup-panel">
            <div className="backup-actions">
              <button className="button-primary" onClick={exportBackup}>Vie varmuuskopio</button>
              <label className="button-secondary backup-import-label">Tuo varmuuskopio<input type="file" accept="application/json,.json" onChange={(event) => { void importBackup(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
            </div>
            <div className="backup-size-row"><strong>{formatFileSize(backupSize)}</strong></div>
            {backupStatus && <p className={`backup-status ${backupStatus.includes("epäonnistui") || backupStatus.includes("ei ole") || backupStatus.includes("ei löytynyt") ? "error" : ""}`}>{backupStatus}</p>}
          </div>
        </section>
        <section className="preference-section preference-info">
          <div><span className="eyebrow">TIETOSUOJA JA TALLENNUS</span><h3>Tiedot pysyvät tällä laitteella</h3><p>Joukkueet, pelaajat, muodostelmat ja pelihistoria tallennetaan tämän selaimen paikalliseen tallennustilaan. Niitä ei lähetetä Peluuttimen palvelimelle.</p></div>
          <div className="storage-info">
            <section><h3>Pidä tiedot tallessa</h3><p>Selaimen sivustodatan tyhjentäminen tai selaimen poistaminen voi poistaa tallennetut tiedot. Vie varmuuskopio tiedostoksi, jos haluat säilyttää kopion muualla.</p></section>
            <section><h3>Tietojen poistaminen</h3><p>Voit poistaa yksittäisiä pelejä tai kokonaisen joukkueen Joukkueet-näkymästä. Kaikki tiedot voi poistaa myös tyhjentämällä Peluuttimen sivustodatan selaimen asetuksista.</p></section>
            <section><h3>Pelaajien tiedot</h3><p>Lisää vain pelin seuraamiseen tarvittavat tiedot. Etunimi tai kutsumanimi ja pelinumero riittävät yleensä.</p></section>
          </div>
        </section>
      </section>
    </div>
  );
}
