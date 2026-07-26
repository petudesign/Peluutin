interface PregameViewProps {
  hasPlayers: boolean;
  teamName: string;
  onNewMatch: () => void;
  onOpenSettings: () => void;
}

export function PregameView({ hasPlayers, teamName, onNewMatch, onOpenSettings }: PregameViewProps) {
  return (
    <section className="pregame-workspace">
      <div className="pregame-card">
        <span className="pregame-icon" aria-hidden="true">
          {hasPlayers ? "✓" : <img className="add-icon" src="/assets/icon-add.svg" alt="" />}
        </span>
        <span className="eyebrow">SEURAAVA VAIHE</span>
        <h1>{hasPlayers ? "Luo joukkueelle peli" : "Lisää joukkueen pelaajat"}</h1>
        <p>{hasPlayers
          ? "Valitse vastustaja, koti- tai vieraspeli sekä tämän ottelun aktiiviset pelaajat ennen kellon käynnistämistä."
          : `${teamName} on luotu. Lisää seuraavaksi pelaajat, jotta voit muodostaa kokoonpanon ja aloittaa pelin.`}</p>
        <button onClick={hasPlayers ? onNewMatch : onOpenSettings}>
          {hasPlayers ? "Luo uusi peli" : "Avaa pelaaja-asetukset"}
        </button>
        {hasPlayers && <button className="pregame-secondary" onClick={onOpenSettings}>Muokkaa joukkuetta</button>}
      </div>
    </section>
  );
}
