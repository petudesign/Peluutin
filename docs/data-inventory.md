# Peluuttimen tietokartta

Tila: sisäinen työasiakirja  
Päivitetty: 23.8.2026  
Omistaja: Peluuttimen ylläpitäjä

Tämä asiakirja kuvaa, mitä tietoa Peluutin käsittelee, miksi tietoa tarvitaan,
missä se sijaitsee ja kuka siihen pääsee. Kartta päivitetään ennen uuden
tietolähteen, analytiikkatapahtuman, pilvitallennuksen tai integraation
käyttöönottoa.

## Periaatteet

- Kerää vain tietoa, jolla on nimetty käyttötarkoitus.
- Älä lähetä pelaajien, joukkueiden tai vastustajien nimiä
  käyttöanalytiikkaan.
- Älä lähetä vapaita tekstikenttiä tai hylättyjä kenttäarvoja
  käyttöanalytiikkaan.
- Pidä sisäinen käyttöanalytiikka erillään käyttäjälle näkyvästä
  valmennusanalytiikasta.
- Merkitse suunniteltu tiedonkäsittely erikseen; suunnitelma ei tarkoita, että
  kerääminen olisi jo käytössä.
- Määritä poisto- tai tarkistusajankohta ennen palvelimelle tallentamista.

## Nykyinen tiedonkäsittely

### Joukkueet ja pelaajat

| Kohta | Kuvaus |
| --- | --- |
| Tiedot | Joukkueen nimi, pelaajan nimi ja numero, muodostelmat sekä tallennettu otteluhistoria. Otteluhistoria voi sisältää vastustajan nimen, päivämäärän, tuloksen, ottelun keston, pelaajien peliajat ja maalit. |
| Tarkoitus | Joukkueen kokoonpanon, peluuttamisen ja otteluhistorian käyttäminen. |
| Sijainti | Käyttäjän selaimen `localStorage`, avain `vaihtopeli-teams`. |
| Siirto palvelimelle | Ei nykyisessä toteutuksessa. |
| Pääsy | Käyttäjä ja henkilöt, joilla on pääsy samaan laitteeseen ja selainprofiiliin. |
| Säilytys | Kunnes käyttäjä poistaa joukkueen, tyhjentää selaintiedot tai poistaa selainprofiilin. |
| Rekisteröidyt | Valmentaja tai muu käyttäjä sekä käyttäjän lisäämät pelaajat; pelaajat voivat olla alaikäisiä. |

### Käynnissä oleva ja ajastettu ottelu

| Kohta | Kuvaus |
| --- | --- |
| Tiedot | Joukkue, vastustaja, koti- tai vierasottelu, osallistujat, kokoonpano, kello, peliajat, tulos ja maalit. Ajastetussa ottelussa myös suunniteltu ajankohta. |
| Tarkoitus | Keskeneräisen ottelun palauttaminen ja tulevien otteluiden avaaminen. |
| Sijainti | Käyttäjän selaimen `localStorage`, avaimet `peluutin-active-match` ja `peluutin-scheduled-matches`. |
| Siirto palvelimelle | Ei nykyisessä toteutuksessa. |
| Pääsy | Käyttäjä ja henkilöt, joilla on pääsy samaan laitteeseen ja selainprofiiliin. |
| Säilytys | Aktiivinen ottelu poistetaan ottelun päättyessä tai hylättäessä. Ajastettu ottelu säilyy, kunnes se avataan, poistetaan tai selaintiedot tyhjennetään. |

### Harjoiteluonnokset

| Kohta | Kuvaus |
| --- | --- |
| Tiedot | Harjoitteen nimi, kentälle asetetut kohteet, reitit, ajoitukset ja harjoitteen muut asetukset. Luonnos voi sisältää joukkueesta tuotuja pelaajien nimiä. |
| Tarkoitus | Harjoitteen automaattinen paikallinen tallennus ja jatkaminen myöhemmin. |
| Sijainti | Käyttäjän selaimen `localStorage`, joukkuekohtainen avain `peluutin-exercise-draft-v1-*`. |
| Siirto palvelimelle | Ei nykyisessä toteutuksessa. |
| Pääsy | Käyttäjä ja henkilöt, joilla on pääsy samaan laitteeseen ja selainprofiiliin. |
| Säilytys | Kunnes luonnos korvataan tai selaintiedot tyhjennetään. Erillinen poistotoiminto on arvioitava ennen laajempaa julkaisua. |

### Käyttöliittymän asetukset

| Kohta | Kuvaus |
| --- | --- |
| Tiedot | Vaalea tai tumma teema, harjoitetyökalujen puoli ja pelaajien nimien näkyvyys harjoitteessa. |
| Tarkoitus | Käyttäjän valintojen muistaminen. |
| Sijainti | Käyttäjän selaimen `localStorage`. |
| Siirto palvelimelle | Ei. |
| Säilytys | Kunnes käyttäjä muuttaa asetusta tai tyhjentää selaintiedot. |

### Vercel Web Analytics

| Kohta | Kuvaus |
| --- | --- |
| Tiedot | Sivulataus, aikaleima, sivupolku, viittaava sivu, karkea maantieteellinen alue, laitetyyppi, käyttöjärjestelmä ja selain. Vercel muodostaa vierailijan tunnistamiseen päivittäin vaihtuvan tiivisteen eikä käytä Web Analyticsissa evästeitä. |
| Tarkoitus | Liikenteen, laitejakauman ja sivujen käytön aggregoitu perustaso. |
| Sijainti | Vercel Web Analytics. |
| Siirto palvelimelle | Kyllä, Vercelin analytiikkapalveluun. |
| Pääsy | Peluuttimen Vercel-projektiin oikeutettu ylläpitäjä. |
| Säilytys | Vercelin käytössä olevan paketin raportointi- ja säilytysehtojen mukainen. Hobby-paketin taattu raportointi-ikkuna on tätä asiakirjaa päivitettäessä yksi kuukausi; palveluntarjoajan ehdot tarkistetaan säännöllisesti. |
| Rajaus | Ei pelaajien, joukkueiden tai vastustajien nimiä eikä lomakekenttien sisältöä. |

## PostHog-käyttöanalytiikka

| Kohta | Kuvaus |
| --- | --- |
| Tiedot | Ennalta nimetyt tapahtumat sovelluksen avaamisesta, osion avaamisesta, joukkueen ja ottelun luomisesta sekä ottelun päättämisestä. Lisäksi käsittelemättömän teknisen virheen tyyppi, stack trace, sovellusversio ja Reactin juuritason virheen rajaus. Ominaisuudet on rajattu lajiin, osioon, tapahtuman lähteeseen, tallennusvalintaan ja karkeaan kestoluokkaan. PostHog lisää tapahtumiin teknisiä selain- ja laitetietoja. |
| Tarkoitus | Löytää ensikäytön keskeytyskohdat, ymmärtää ydintoimintojen käyttöä ja paikantaa sovelluksen teknisiä virheitä. |
| Sijainti | PostHog EU Cloud, kun `VITE_POSTHOG_KEY` on asetettu tuotantoympäristöön. |
| Siirtoreitti | Selain lähettää tapahtumat saman alkuperän `/rinki`-polkuun. Vercel välittää pyynnöt PostHogin EU-ingest-palveluun. Näin tiukka `connect-src 'self'` -suojaus säilyy. |
| Pääsy | Peluuttimen PostHog-projektiin oikeutettu ylläpitäjä. |
| Käynnistyminen | Vain käyttäjän nimenomaisen valinnan jälkeen. Valinnan voi muuttaa Peluuttimen asetuksissa. |
| Rajaus | Automaattinen klikkausten keruu, session replay, console-virheiden keruu ja henkilöprofiilit ovat pois käytöstä. Poikkeuksista kerätään vain käsittelemättömät virheet ja promise-hylkäykset käyttäjän suostumuksen jälkeen. Virheviestin sisältö ja virhettä edeltävät vapaamuotoiset vaiheet poistetaan selaimessa ennen lähetystä; virheen tyyppi ja stack trace säilytetään paikantamista varten. Pelaajien, joukkueiden ja vastustajien nimiä, vapaita tekstikenttiä, kokoonpanoja tai tarkkoja peliaikoja ei lähetetä. |
| Säilytys | **[Määritä PostHog-projektin säilytysaika ennen tuotantokäyttöä.]** |

### Sallittu tapahtumaluettelo, skeemaversio 1

| Tapahtuma | Sallitut omat ominaisuudet |
| --- | --- |
| `application_opened` | `module`, `sport`, `schema_version` |
| `analytics_consent_updated` | `choice`, `sport`, `schema_version` |
| `feature_opened` | `module`, `sport`, `schema_version` |
| `team_created` | `source`, `sport`, `schema_version` |
| `match_created` | `source`, `sport`, `schema_version` |
| `match_completed` | `saved`, `duration_bucket`, `sport`, `schema_version` |
| `$exception` | PostHogin virhetyyppi ja stack trace; redaktoitu viesti, `app_version`, mahdollinen `boundary` |

## Tuleva pilvitallennus — ei vielä käytössä

Autentikointi, synkronointi ja käyttäjälle näkyvä valmennusanalytiikka arvioidaan
omana kokonaisuutenaan ennen toteutusta. Ennen pelaajatietojen siirtämistä
palvelimelle ratkaistaan vähintään:

- rekisterinpitäjän ja mahdollisten henkilötietojen käsittelijöiden roolit;
- valmentajan tai seuran oikeus tallentaa pelaajatietoja;
- alaikäisten pelaajien tietojen erityinen suoja;
- käyttöoikeudet joukkueeseen ja vähimmän oikeuden periaate;
- tiedon vienti, korjaaminen ja poistaminen;
- varmuuskopiot ja poistojen ulottuminen niihin;
- säilytysajat ottelu-, harjoitus- ja käyttäjätilitiedoille;
- palveluntarjoajat, käsittelysopimukset ja tietojen sijainti;
- tietoturvaloukkausten havaitseminen ja toimintamalli.

## Avoimet päätökset ennen PostHogin tuotantokäyttöä

1. Määritetään ja dokumentoidaan PostHog-projektin säilytys- ja poistokäytäntö.
2. Täydennetään rekisterinpitäjän tiedot ja julkaistaan tietosuojaseloste.
3. Tarkistetaan PostHogin käsittelyehdot ja alihankkijat.
4. Testataan selaimen verkkotyökaluilla, ettei verkkoon lähde nimiä tai muuta kiellettyä sisältöä.
5. Määritetään tuotannon source map -julkaisu, jotta minifioidut stack tracet voidaan yhdistää lähdekoodiin.

## Muutosloki

- 23.8.2026: Ensimmäinen kartoitus nykyisestä paikallistallennuksesta,
  Vercel Web Analyticsista ja suunnitellun käyttöanalytiikan rajoista.
- 23.8.2026: Lisätty suostumukseen perustuvan PostHog EU Cloud -integraation
  tapahtumaluettelo ja tekniset suojaukset.
- 23.8.2026: Lisätty suostumukseen sidottu teknisten poikkeusten keruu,
  virheviestien selaimessa tehtävä redaktointi ja sovellusversion seuranta.
  Suostumusversio nostettiin, jotta lupa pyydetään myös nykyisiltä käyttäjiltä
  uudelleen laajentuneelle tietoryhmälle.
