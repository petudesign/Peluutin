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

## Suunniteltu käyttöanalytiikka — ei vielä käytössä

| Tietoryhmä | Suunniteltu tarkoitus | Sallittu sisältö | Kielletty sisältö | Avoin päätös |
| --- | --- | --- | --- | --- |
| Käyttöpolun tapahtumat | Löytää ensikäytön keskeytyskohdat. | Ennalta nimetty tapahtuma, osio, laji, laiteryhmä ja demo/oikea käyttö. | Nimet, vapaa teksti, kokoonpanon sisältö ja tarkka otteludata. | Palveluntarjoaja, käsittelyperuste ja säilytysaika. |
| Virhetapahtumat | Tunnistaa epäselvät validoinnit ja tekniset ongelmat. | Näkymä, kentän tekninen tunniste ja ennalta määritetty virheluokka. | Hylätty kenttäarvo, koko lomake tai sovelluksen tilannevedos. | Virheluokkien lista ja vähimmäismäärä ennen raportointia. |
| Anonyymi asennustunniste | Arvioida paluuta samalla selaimella. | Satunnainen tunniste, ensimmäisen käytön ajankohta ja aktivoitumisen tila. | Sähköposti, nimi, IP-osoite tai laitteiden välinen yhdistely. | Tarpeellisuus, käsittelyperuste, suostumusratkaisu ja vanheneminen. |

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

## Avoimet päätökset ennen käyttöanalytiikkaa

1. Valitaan analytiikkapalvelu ja EU-alue.
2. Päätetään käsittelyperuste ja mahdollinen suostumusratkaisu.
3. Määritetään tapahtumien täsmällinen sallittu skeema.
4. Määritetään säilytys- ja poistokäytäntö.
5. Päivitetään käyttäjälle näkyvä tietosuojaseloste ennen käyttöönottoa.
6. Testataan, ettei verkkoon lähde nimiä tai muuta kiellettyä sisältöä.

## Muutosloki

- 23.8.2026: Ensimmäinen kartoitus nykyisestä paikallistallennuksesta,
  Vercel Web Analyticsista ja suunnitellun käyttöanalytiikan rajoista.
