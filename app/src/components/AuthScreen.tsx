import { FormEvent, useState } from "react";

type AuthMode = "login" | "signup";

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [notice, setNotice] = useState("");

  const isSignup = mode === "signup";
  const canSubmit = isSignup
    ? Boolean(name.trim() && email.trim() && password && password === confirmPassword && acceptedTerms)
    : Boolean(email.trim() && password);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setNotice("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    localStorage.setItem("peluutin-auth", "local-session");
    onAuthenticated();
  };

  return (
    <main className="auth-shell">
      <div className="auth-page">
        <header className="auth-header">
          <img src="/assets/peluutin-logo.svg" alt="Peluutin" />
          <div className="auth-header-action">
            <span>{isSignup ? "Onko sinulla jo tili?" : "Ensimmäistä kertaa täällä?"}</span>
            <button type="button" className="auth-header-button" onClick={() => switchMode(isSignup ? "login" : "signup")}>
              {isSignup ? "Kirjaudu" : "Luo tili"}
            </button>
          </div>
        </header>

        <section className="auth-main">
          <aside className="auth-intro">
            <div>
              <p className="auth-eyebrow">Joukkueen arki, vähemmän säätöä</p>
              <h1>{isSignup ? "Aloita joukkueen parempi arki." : "Joukkueesi peli, yhdessä paikassa."}</h1>
              <p className="auth-lead">
                {isSignup
                  ? "Luo tili ja hallitse otteluita, pelaajia, peliaikoja ja harjoitteita yhdessä paikassa."
                  : "Kokoonpanot, peliajat ja ottelut ilman ylimääräistä säätöä."}
              </p>
              <ul className="auth-benefits">
                {(isSignup
                  ? ["Yksi tili joukkueesi tietoihin", "Ottelut ja kokoonpanot samassa paikassa", "Toimii jalkapallossa ja futsalissa"]
                  : ["Muodosta kokoonpanot ja hallitse vaihtoja", "Seuraa pelaajien peliaikoja ottelun aikana", "Tallenna ottelut ja palaa historiaan"]
                ).map((benefit) => <li key={benefit}><span aria-hidden="true">✓</span>{benefit}</li>)}
              </ul>
            </div>
            <p className="auth-footnote"><span aria-hidden="true">+</span> Valmis seuraavaan otteluun</p>
          </aside>

          <section className="auth-card" aria-labelledby="auth-title">
            <div className="auth-card-heading">
              <h2 id="auth-title">{isSignup ? "Luo tili" : "Kirjaudu sisään"}</h2>
              <p>{isSignup ? "Se vie vain hetken." : "Jatka oman joukkueesi parissa."}</p>
            </div>
            <form onSubmit={submit}>
              {isSignup && <label><span>Nimi</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Etunimi Sukunimi" autoComplete="name" /></label>}
              <label><span>Sähköposti</span><input autoFocus={!isSignup} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="sinä@esimerkki.fi" autoComplete="email" /></label>
              <label><span>Salasana</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete={isSignup ? "new-password" : "current-password"} /></label>
              {isSignup && <label><span>Vahvista salasana</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" autoComplete="new-password" /></label>}
              {isSignup ? (
                <label className="auth-check"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /><span>Hyväksyn tietosuojan ja käyttöehdot.</span></label>
              ) : (
                <div className="auth-options"><label className="auth-check"><input type="checkbox" /><span>Muista minut</span></label><button type="button" className="auth-link" onClick={() => setNotice("Salasanan palautus kytketään seuraavassa vaiheessa.")}>Unohditko salasanan?</button></div>
              )}
              <button className="auth-submit" type="submit" disabled={!canSubmit}>{isSignup ? "Luo tili" : "Kirjaudu sisään"}</button>
            </form>
            <div className="auth-divider"><span>tai</span></div>
            <button className="auth-google" type="button" onClick={() => setNotice("Google-kirjautuminen kytketään seuraavassa vaiheessa.")}>Jatka Google-tilillä</button>
            <p className="auth-switch">
              {isSignup ? "Onko sinulla jo tiliä?" : "Eikö sinulla ole vielä tiliä?"}{" "}
              <button type="button" onClick={() => switchMode(isSignup ? "login" : "signup")}>
                {isSignup ? "Kirjaudu" : "Luo tili"}
              </button>
            </p>
            {notice && <p className="auth-notice" role="status">{notice}</p>}
          </section>
        </section>

        <footer className="auth-footer"><span>© 2026 Peluutin</span><nav><a href="/privacy.html">Tietosuoja</a><a href="#ehdot">Käyttöehdot</a><a href="#evasteet">Evästeet</a></nav></footer>
      </div>
    </main>
  );
}
