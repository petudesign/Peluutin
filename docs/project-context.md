# Peluutin — projektikonteksti

Päivitetty: 23.8.2026

Tämä on nopea aloituspiste projektiin tulevalle kehittäjälle tai avustavalle
agentille. Tarkemmat tietosuojatiedot ovat `data-inventory.md`-tiedostossa.

## Tuotteen suunta

Peluutin auttaa valmentajaa suunnittelemaan ja seuraamaan peluuttamista.
Nykyinen toteutus on jalkapallolle, mutta tuotteen on tarkoitus tukea myöhemmin
myös koripalloa, futsalia, salibandya ja mahdollisesti muita joukkuelajeja.

Lajit, käyttäjälle näkyvä valmennusanalytiikka ja ylläpitäjän sisäinen
käyttöanalytiikka ovat eri käsitteitä:

- lajikohtaiset ominaisuudet kuuluvat Peluuttimen käyttäjille;
- valmennusanalytiikka auttaa käyttäjää oman joukkueensa kanssa;
- käyttöanalytiikka auttaa ylläpitäjää parantamaan Peluutinta eikä näy
  käyttäjille.

## Nykyinen tekninen tila

- React 19 + Vite + TypeScript.
- Ei käyttäjätilejä eikä pilvisynkronointia.
- Joukkue-, pelaaja-, ottelu- ja harjoitetiedot tallennetaan selaimeen.
- Vercel Web Analytics mittaa liikenteen perustasoa.
- PostHog-integraatio kerää suostumuksen jälkeen vain ennalta määritettyjä
  tuotetapahtumia EU Cloudiin.

## Analytiikan päätökset

- Sovelluskoodi käyttää omaa `analytics.track(...)`-rajapintaa eikä kutsu
  PostHogia suoraan.
- Kaikissa omissa tapahtumissa on `sport` ja `schema_version`, jotta uusia
  lajeja ja skeemamuutoksia voidaan erotella myöhemmin.
- Autocapture, session replay, automaattinen virhekeruu ja henkilöprofiilit
  ovat pois käytöstä.
- Nimiä, vapaita tekstikenttiä, kokoonpanoja tai tarkkoja peliaikoja ei lähetetä.
- PostHog ladataan vasta käyttäjän suostumuksen jälkeen, jotta se ei kasvata
  ydinnäkymän alkulatausta turhaan.
- Tapahtumat kulkevat Vercelin first-party `/rinki`-proxyn kautta PostHogin
  EU-ingest-palveluun. Suoraa ulkoista yhteyttä ei sallita Content Security
  Policyssa.
- Sallittu tapahtumaluettelo dokumentoidaan `data-inventory.md`-tiedostossa.

## Seuraavat tärkeät vaiheet

1. Testaa PostHog Preview-deploymentissa ja varmista verkkopyynnöistä, ettei
   kiellettyä tietoa lähde palveluun.
2. Määritä PostHog-tapahtumien säilytysaika ja täydennä tietosuojaseloste.
3. Julkaise tietosuojaseloste sovelluksessa ennen tuotantokeruun aloittamista.
4. Määritä ensimmäisen käyttöönoton funnel ja sen päätöksenteossa käytettävät
   mittarit ennen uusien tapahtumien lisäämistä.
5. Suunnittele monilajinen tietomalli ennen koripallotoimintojen toteutusta;
   älä lisää lajivalintaa jokaiseen työnkulkuun ilman käyttäjätarvetta.

## Työskentelykäytäntö

PR-kuvauksessa kerrotaan vähintään:

- käyttäjä- tai tuotetavoite;
- toteutuksen olennaiset päätökset ja rajaukset;
- tietosuoja- tai migraatiovaikutukset;
- tehdyt tarkistukset;
- käyttöönoton vaatimat ympäristömuuttujat tai manuaaliset vaiheet.

Pidä tämä tiedosto tiiviinä. Tapauskohtaiset toteutusyksityiskohdat kuuluvat
PR:ään, ja case study -muistiinpanot pidetään erillisessä paikallisessa
tiedostossa, jota Git ei seuraa.
