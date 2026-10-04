# Glass To‑do – Einrichtung mit Firebase

Die App ist eine einzelne `index.html`. Ohne Firebase‑Konfiguration läuft sie im **Gastmodus**: Die Aufgaben bleiben dann nur auf diesem Gerät. Mit Konfiguration meldest du dich auf Handy und PC mit demselben Account an und siehst überall dieselben Aufgaben in Echtzeit.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette App: CSS und JS inline, Firebase SDK 12.19.0 per CDN |
| `firestore.rules` | Sicherheitsregeln für die Datenbank (in Firebase veröffentlichen) |
| `sw.js` | *Optional:* App startet auch ohne Netz. Neben `index.html` hochladen |
| `firebase.json`, `package.json`, `tests/` | *Optional:* automatischer Test der Regeln (`npm install && npm run test:rules`) |

**Warum es keine `storage.rules` gibt:** Du hast dich für den kostenlosen Spark‑Tarif entschieden. Firebase Storage verlangt für neue Projekte den Blaze‑Tarif. Deshalb verkleinert die App eigene Hintergrundbilder auf bis zu 1920 px und komprimiert sie als WebP bzw. JPEG auf höchstens ca. 520 KB. Sie werden direkt in Firestore unter `users/{uid}/assets/background` gespeichert, und die Firestore‑Regeln begrenzen sie dort. Ein Storage‑Bucket wird nicht gebraucht.

## Datenstruktur

```
users/{uid}                         { bg: { kind: "default"|"url"|"upload", url }, updatedAt }
users/{uid}/tasks/{taskId}          { text, prio: "yellow"|"red", done, order, createdAt, doneAt, updatedAt }
users/{uid}/assets/background       { mime, data (Base64), updatedAt }   ← nur bei eigenem Bild
```

---

## Schritt für Schritt

### 1. Firebase‑Projekt anlegen
1. Öffne <https://console.firebase.google.com> und klicke auf **Projekt erstellen**.
2. Gib einen Namen ein, z. B. `glass-todo`. Google Analytics brauchst du nicht. Klicke auf **Projekt erstellen**.
3. Der Tarif bleibt **Spark (kostenlos)**. Du musst nichts upgraden.

### 2. Web‑App registrieren und Config kopieren
1. Klicke in der Projektübersicht auf das Web‑Symbol **`</>`**, um eine App hinzuzufügen.
2. Vergib einen Spitznamen, z. B. `Glass To‑do`. „Firebase Hosting“ musst du **nicht** anhaken. Klicke auf **App registrieren**.
3. Kopiere das angezeigte `firebaseConfig`‑Objekt. Später findest du es auch unter ⚙️ **Projekteinstellungen → Allgemein → Meine Apps**.

### 3. Authentication aktivieren
1. Gehe zu **Build → Authentication → Jetzt starten**.
2. Öffne den Tab **Anmeldemethode**:
   - Aktiviere **E‑Mail/Passwort** (nur den ersten Schalter, nicht „E‑Mail‑Link“) und speichere.
   - Klicke auf **Neuer Anbieter → Google**, aktiviere ihn, wähle eine **Support‑E‑Mail‑Adresse** und speichere.
3. *Optional:* Unter **Vorlagen** kannst du die Sprache der E‑Mails (Passwort zurücksetzen, Bestätigung) auf Deutsch stellen. Die App fordert sie ohnehin auf Deutsch an.

### 4. Autorisierte Domains eintragen
Gehe zu **Authentication → Einstellungen → Autorisierte Domains → Domain hinzufügen** und trage ein:
- für GitHub Pages: `DEINNAME.github.io` (nur die Domain, ohne `https://` und ohne Pfad)
- für eine eigene Domain: z. B. `schlitt.co` und, falls genutzt, `todo.schlitt.co`

`localhost` und `DEIN-PROJEKT.firebaseapp.com` stehen dort schon. Fehlt deine Domain, meldet die App beim Login: *„Diese Domain ist in Firebase nicht autorisiert“*.

### 5. Firestore einrichten
1. Gehe zu **Build → Firestore Database → Datenbank erstellen**.
2. Wähle als Standort am besten **eur3 (Europe)** oder `europe-west3` (Frankfurt). Der Standort lässt sich später **nicht** mehr ändern.
3. Starte im **Produktionsmodus**.

### 6. Regeln veröffentlichen
1. Öffne **Firestore Database → Regeln**.
2. Ersetze den gesamten Inhalt durch den Inhalt von `firestore.rules`.
3. Klicke auf **Veröffentlichen**.

*Alternativ per Kommandozeile:* `npx firebase-tools login`, dann `npx firebase-tools use --add` und anschließend `npm run deploy:rules`.

### 7. Config in `index.html` einfügen
Oben im `<script>` steht ein deutlich markierter Block:

```js
/* 1) FIREBASE-KONFIGURATION – HIER DEINE WERTE EINFÜGEN */
const firebaseConfig = {
  apiKey: 'DEIN_API_KEY',
  authDomain: 'DEIN-PROJEKT.firebaseapp.com',
  projectId: 'DEIN-PROJEKT',
  appId: 'DEINE_APP_ID',
};
```

Ersetze die Werte durch deine. Du kannst auch das ganze kopierte Objekt einfügen. Zusätzliche Felder wie `storageBucket` oder `messagingSenderId` stören nicht.

### 8. Veröffentlichen
Lade `index.html` und, wenn du den Offline‑Start willst, `sw.js` in dasselbe Verzeichnis hoch (GitHub Pages oder dein Webspace). Die Seite muss über **https** laufen.

---

## Warum der `apiKey` öffentlich sein darf

Der Firebase‑`apiKey` ist **kein Passwort**. Er sagt Google nur, zu welchem Projekt eine Anfrage gehört, und steht bei jeder Firebase‑Web‑App sichtbar im Quelltext. Geschützt werden deine Daten durch zwei andere Dinge:

1. **Authentication** stellt fest, *wer* du bist. Jede Anfrage trägt ein signiertes Token mit deiner `uid`, und das lässt sich nicht fälschen.
2. Die **Sicherheitsregeln** (`firestore.rules`) laufen auf Googles Servern und entscheiden, *was* du darfst. Bei dieser App heißt das: nur `users/{deine uid}/…` lesen und schreiben, nur gültige Felder, Text mit 1–500 Zeichen, `prio` nur `yellow` oder `red`.

Wer deinen `apiKey` kopiert, kann damit höchstens ein eigenes Konto anlegen und dann seine **eigenen** Aufgaben speichern. Auf deine Daten kommt er nicht.

*Optional zur Härtung:* In der Google Cloud Console unter **APIs & Dienste → Anmeldedaten** kannst du den Browser‑Schlüssel auf **HTTP‑Referrer** beschränken. Trag dabei unbedingt auch `DEIN-PROJEKT.firebaseapp.com/*` ein, sonst funktioniert der Google‑Login nicht mehr. Firebase **App Check** wäre eine weitere optionale Schutzschicht gegen fremde Clients.

---

## Hinweise

- **Offline:** Firestore speichert alles im Browser (IndexedDB). Änderungen ohne Netz erscheinen sofort und werden später synchronisiert. Dazu siehst du Toasts: „Offline …“, „Wieder online …“ und „Alle Änderungen synchronisiert“. Damit die App auch **offline neu gestartet** werden kann, muss `sw.js` mit hochgeladen sein.
- **Abmelden** löscht den Offline‑Cache auf dem Gerät, damit auf geteilten Rechnern nichts zurückbleibt. Gibt es noch nicht synchronisierte Änderungen, fragt die App vorher nach.
- **Migration:** Beim ersten Login auf einem Gerät mit alten lokalen Daten (`glassTodos.v2`, `glassTodos.profile.*`) bietet ein Dialog die Übernahme an. Doppelte Einträge mit gleichem Text und gleicher Priorität werden übersprungen. Erst wenn der Server die Übernahme bestätigt hat, werden die lokalen Daten und die alten Passwort‑Hashes gelöscht.
- **Kostenloses Kontingent (Spark):** 50.000 Lesevorgänge und 20.000 Schreibvorgänge pro Tag sowie 1 GiB Speicher. Das ist für eine persönliche To‑do‑Liste weit mehr als genug.
- **Google Fonts:** Die Schrift Inter wird weiterhin von Google geladen, damit die Optik exakt gleich bleibt. Dabei wird die IP‑Adresse der Besucher an Google übertragen. Wenn du das vermeiden willst, hoste die Schrift selbst und ersetze die `<link>`‑Zeilen im `<head>` durch einen lokalen `@font-face`.
- **Bedienung:** Bearbeiten geht per Doppelklick, Doppeltipp oder Enter auf den Text. Zum Verschieben ziehst du den Griff `::` (Maus oder Finger) oder fokussierst ihn und nutzt die Pfeiltasten (alternativ Alt + ↑/↓). Esc schließt Panels und Dialoge. Nach dem Löschen kannst du im Toast auf „Rückgängig“ tippen.

---

## Testliste

Hake ab, wenn es funktioniert.

### Gastmodus (ohne Login)
- [ ] Die Seite lädt ohne Hinweis‑Dialog, auch auf dem Handy, und lässt sich bei vielen Aufgaben scrollen.
- [ ] Aufgabe hinzufügen (Enter), Priorität rot/gelb, abhaken, Doppelklick zum Bearbeiten, löschen und „Rückgängig“: alles funktioniert.
- [ ] Ziehen mit der Maus und auf dem Handy am Griff `::` ändert die Reihenfolge, und sie bleibt nach dem Neuladen erhalten.
- [ ] Der Filter über die Ampel (Rot = Alle, Gelb = Offen, Grün = Erledigt) funktioniert, und die Beschriftung oben rechts ändert sich.

### Registrierung und Login
- [ ] Unter **Login** E‑Mail und Passwort eingeben und auf **Registrieren** klicken: Der Toast „Konto erstellt“ erscheint, und der Button zeigt die E‑Mail. In der Firebase Console unter Authentication → Nutzer erscheint der Account.
- [ ] Abmelden und mit **falschem** Passwort anmelden: Der Toast „E‑Mail oder Passwort ist falsch“ erscheint.
- [ ] **Passwort vergessen?** liefert eine E‑Mail zum Zurücksetzen (auch den Spam‑Ordner prüfen).
- [ ] **Mit Google anmelden** funktioniert auf PC und Handy.

### Zwei Geräte gleichzeitig
- [ ] Mit demselben Account auf PC und Handy anmelden: Beide zeigen dieselben Aufgaben.
- [ ] Aufgabe am PC anlegen: Sie erscheint nach ca. 1 Sekunde am Handy, ohne Neuladen.
- [ ] Abhaken, Bearbeiten, Verschieben und Löschen am Handy: Der PC zeigt die Änderungen sofort.
- [ ] Ein eigenes Hintergrundbild am PC hochladen: Es erscheint auch am Handy. „Zurücksetzen“ wirkt ebenfalls auf beiden Geräten.

### Offline
- [ ] Am Handy den Flugmodus einschalten: Der Toast „Offline …“ erscheint.
- [ ] Offline 2 Aufgaben anlegen und eine abhaken: Das ist sofort sichtbar, am PC aber noch nicht.
- [ ] Den Flugmodus ausschalten: Erst kommt „Wieder online …“, dann „Alle Änderungen synchronisiert“, und der PC zeigt die Änderungen.
- [ ] *(mit `sw.js`)* Offline die Seite neu laden: Die App startet trotzdem und zeigt die Aufgaben.

### Migration
- [ ] Die **alte** Version der App öffnen, Aufgaben anlegen (ohne Login und/oder mit altem Profil) und die neue `index.html` auf **derselben Domain** öffnen.
- [ ] Im Gastmodus sind die alten Aufgaben ohne Login sichtbar.
- [ ] Beim Anmelden erscheint der Dialog „Lokale Aufgaben übernehmen?“ mit allen Quellen.
- [ ] Nach **Übernehmen** stehen die Aufgaben im Account, also auch auf dem zweiten Gerät. In den DevTools unter Application → Local Storage sind `glassTodos.v2`, `glassTodos.profile.*` und `glassTodos.user` verschwunden.
- [ ] Beim erneuten Login erscheint der Dialog nicht mehr.

### Zugriff auf fremde Daten muss scheitern
- [ ] Öffne in der Firebase Console **Firestore → Regeln → Rules Playground**:
  - Simulationstyp **get**, Pfad `/users/UID_VON_KONTO_A/tasks/irgendwas`
  - **Authentifiziert** einschalten, als Firebase UID die **UID von Konto B** eintragen (Authentication → Nutzer)
  - Auf **Ausführen** klicken: Das Ergebnis muss **„Zugriff verweigert“** sein.
- [ ] Dasselbe mit der UID von Konto A: Das Ergebnis muss **erlaubt** sein.
- [ ] Simulationstyp **create** mit Text länger als 500 Zeichen oder mit `prio: "blue"`: Das muss **verweigert** werden.
- [ ] *Automatisch (optional, braucht Node.js und Java):* Im Projektordner `npm install` und danach `npm run test:rules` ausführen. Es laufen 43 Prüfungen, darunter fremdes Lesen und Schreiben, nicht angemeldete Zugriffe und ungültige Felder. Am Ende muss „ALL RULE TESTS PASSED“ stehen.
