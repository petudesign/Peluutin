# Peluuttimen tietosuojaseloste — luonnos

Tila: **ei vielä julkaistavaksi**  
Päivitetty: 23.8.2026

Tämä luonnos kuvaa Peluuttimen nykyistä toteutusta. Hakasulkeissa olevat kohdat
ja käsittelyn oikeusperuste on täydennettävä ja tarkistettava ennen julkaisua.
Luonnos ei korvaa tietosuoja-asiantuntijan arviota etenkin silloin, kun
pelaajatietoja aletaan tallentaa pilveen.

## 1. Rekisterinpitäjä ja yhteystiedot

Peluuttimen ylläpitäjä: **[täydennä nimi tai yritys]**  
Yhteystieto tietosuoja-asioissa: **[täydennä sähköpostiosoite]**

## 2. Mitä Peluutin tallentaa käyttäjän laitteelle?

Peluutin tallentaa käyttäjän selaimeen joukkueen, pelaajien, muodostelmien,
otteluiden ja harjoiteluonnosten tietoja sekä käyttöliittymän asetuksia. Näitä
tietoja tarvitaan Peluuttimen toimintojen käyttämiseen ja keskeneräisen työn
jatkamiseen.

Nykyisessä versiossa näitä joukkue-, pelaaja-, ottelu- tai harjoitetietoja ei
lähetetä Peluuttimen palvelimelle. Ne säilyvät sillä laitteella ja siinä
selainprofiilissa, jolla Peluutinta käytetään. Tiedot voivat olla muiden samaa
laitetta tai selainprofiilia käyttävien henkilöiden nähtävissä.

Paikalliset tiedot säilyvät, kunnes käyttäjä poistaa tiedot Peluuttimessa,
tyhjentää selaimen tiedot tai poistaa selainprofiilin. Kaikille paikallisille
tietoryhmille ei vielä ole erillistä poistopainiketta.

## 3. Verkkosivuston käyttöanalytiikka

Peluutin käyttää Vercel Web Analyticsia sivuston käytön aggregoituun
mittaamiseen. Palvelun avulla voidaan tarkastella esimerkiksi sivulatauksia,
laitetyyppejä, selaimia, käyttöjärjestelmiä, viittaavia sivuja ja karkeaa
maantieteellistä jakaumaa.

Vercel Web Analytics ei käytä evästeitä käyttäjän seuraamiseen. Vercelin mukaan
palvelu muodostaa saapuvasta pyynnöstä päivittäin vaihtuvan tiivisteen eikä
tallenna analytiikkatapahtumia nimettyyn henkilöön tai IP-osoitteeseen
yhdistettynä.

Peluuttimen käyttöanalytiikkaan ei tarkoituksellisesti lähetetä pelaajien,
joukkueiden tai vastustajien nimiä eikä lomakkeisiin kirjoitettua sisältöä.

Käyttäjän erillisellä suostumuksella Peluutin lähettää PostHog EU Cloudiin
ennalta määritettyjä tapahtumia sovelluksen ja sen ydintoimintojen käytöstä.
Automaattinen klikkausten keruu, istuntotallenteet, virheiden automaattikeruu
ja henkilöprofiilit on poistettu käytöstä. Ottelun tarkkaa kestoa ei lähetetä,
vaan ainoastaan karkea kestoluokka. Suostumuksen voi antaa, evätä tai muuttaa
Peluuttimen asetuksissa.

Käsittelyn tarkoitus on ymmärtää Peluuttimen liikennettä, laitejakaumaa ja
teknistä käyttöä sekä parantaa palvelun käytettävyyttä.

Käsittelyn oikeusperuste: **[arvioitava ja täydennettävä ennen julkaisua]**.

## 4. Tietojen vastaanottajat ja sijainti

Vercel toimii Peluuttimen teknisenä hosting- ja analytiikkapalveluna. PostHog
toimii suostumukseen perustuvan käyttöanalytiikan käsittelijänä EU Cloud
-ympäristössä. Vercelin
ajantasaiset tiedot henkilötietojen käsittelystä, alihankkijoista ja
kansainvälisistä tiedonsiirroista löytyvät Vercelin omista tietosuoja- ja
käsittelyehdoista.

Palveluntarjoajat ja tietojen sijainti tarkistetaan aina ennen uuden
analytiikka-, kirjautumis- tai pilvitallennuspalvelun käyttöönottoa.

## 5. Säilytys

Paikalliset joukkuetiedot säilyvät käyttäjän selaimessa kohdassa 2 kuvatulla
tavalla.

Vercel Web Analyticsin tietojen saatavuus ja säilytys perustuvat Peluuttimen
käytössä olevan Vercel-paketin ajantasaisiin ehtoihin. Tätä luonnosta
päivitettäessä Hobby-paketin taattu raportointi-ikkuna on yksi kuukausi.

PostHog-tapahtumien säilytysaika: **[täydennä projektissa määritetty aika]**.

## 6. Oikeudet ja yhteydenotot

Jos käsiteltävä tieto on henkilötietoa, rekisteröidyllä voi tilanteesta riippuen
olla oikeus saada tietoa käsittelystä, pyytää tiedon oikaisemista tai
poistamista, rajoittaa tai vastustaa käsittelyä sekä tehdä valitus
tietosuojaviranomaiselle.

Tietosuojaa koskevat pyynnöt voi lähettää osoitteeseen:
**[täydennä sähköpostiosoite]**.

Koska nykyiset joukkue- ja pelaajatiedot sijaitsevat vain käyttäjän omassa
selaimessa, Peluuttimen ylläpitäjä ei pysty näkemään, palauttamaan tai poistamaan
niitä etänä. Käyttäjä voi poistaa ne Peluuttimessa käytettävissä olevilla
poistotoiminnoilla tai tyhjentämällä sivuston selaintiedot.

## 7. Tulevat muutokset

Mahdollinen yksityiskohtaisempi käyttöanalytiikka, käyttäjätilit,
pilvisynkronointi ja käyttäjälle näkyvä valmennusanalytiikka eivät kuulu tähän
nykyiseen kuvaukseen. Tietosuojaseloste ja tietokartta päivitetään ennen niiden
käyttöönottoa.

## Ennen julkaisua ratkaistavat kohdat

- rekisterinpitäjän nimi ja yhteystieto;
- Vercel Web Analyticsin käsittelyn oikeusperuste ja kansallinen
  sähköisen viestinnän arvio;
- linkit Vercelin ajantasaisiin käsittelyehtoihin;
- paikallisten harjoiteluonnosten selkeä poistotapa;
- selosteen paikka Peluuttimen käyttöliittymässä;
- tarvittaessa tietosuoja-asiantuntijan tarkistus.
