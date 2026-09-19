# Lime AI - Projekt-Dokumentation (Open WebUI)

## 1. Projektübersicht
Dieses Projekt basiert auf einem angepassten Fork von [Open WebUI](https://github.com/open-webui/open-webui). Es handelt sich um ein **Bare-Metal-Setup** (ohne Docker) auf einem Netcup vServer. 

**Infrastruktur:**
*   **Server:** Netcup VPS (IP: 62.83.19.50)
*   **Domain:** lime-ai.de
*   **Benutzer:** thomas
*   **Frontend:** SvelteKit (kompiliert in den `build/` Ordner)
*   **Backend:** Python (FastAPI), verwaltet als systemd-Dienst
*   **Webserver/Proxy:** Nginx

## 2. Lokale Entwicklung (Windows / WSL)
Die Entwicklung und Anpassung des Frontends (z.B. UI-Änderungen, Logos, Farben) findet lokal unter Windows statt. Für Dateiübertragungen wird WSL (Windows Subsystem for Linux) genutzt.

### 2.1 Voraussetzungen
*   Node.js (für das Kompilieren des Frontends)
*   Python (für das Backend)
*   WSL (Ubuntu/Debian) eingerichtet inkl. SSH-Key-Authentifizierung für den Server.

### 2.2 Lokales Python-Backend starten
Damit das Frontend im Development-Modus (`npm run dev`) funktioniert und mit der API kommunizieren kann, muss parallel das lokale Backend laufen (standardmäßig auf Port 8080).
1.  Öffne ein **zweites** Terminal im Projektverzeichnis.
2.  Wechsle in den Backend-Ordner:
    ```cmd
    cd backend
    ```
3.  Aktiviere die virtuelle Python-Umgebung (der Name des Ordners kann je nach Setup `venv` oder `.venv` lauten):
    ```cmd
    .\venv\Scripts\activate
    ```
4.  Starte das Backend:
    ```cmd
    .\start_windows.bat
    ```

### 2.3 Lokalen Development-Server starten
Um UI-Anpassungen (Svelte-Komponenten, CSS, JS) während der Entwicklung zu testen:
1.  Öffne ein Terminal im Projektverzeichnis (z. B. `D:\dev\ulime-ai`).
2.  Installiere ggf. neue Abhängigkeiten, falls sich die `package.json` geändert hat: 
    ```cmd
    npm install
    ```
3.  Starte den Svelte-Entwicklungsserver: 
    ```cmd
    npm run dev
    ```
4.  Das Frontend ist nun im Browser (üblicherweise unter `http://localhost:5173`) erreichbar.

### 2.4 Frontend kompilieren (Build)
Sobald die Änderungen fertiggestellt sind, muss das Frontend für den produktiven Einsatz kompiliert werden:
```cmd
npm run build
```
Dadurch wird der `build/` Ordner generiert bzw. aktualisiert, welcher die statischen HTML/CSS/JS-Dateien enthält, die der Server benötigt.

## 3. Deployment-Workflow (Übertragung auf den Server)
Da das Setup bewusst auf Container-Lösungen verzichtet, werden die kompilierten Dateien direkt übertragen. 

### Frontend-Update pushen
Führe in deinem WSL-Terminal im Hauptverzeichnis deines Projekts folgenden Befehl aus:
```bash
rsync -avz --delete build/ thomas@62.83.19.50:/home/thomas/lime-ai/build/
```

*Erklärung der Parameter:*
*   `-a`: Archiv-Modus (erhält Dateirechte, Besitzer und Zeitstempel).
*   `-v`: Verbose (gibt eine detaillierte Liste der übertragenen Dateien aus).
*   `-z`: Komprimiert die Daten während der Übertragung (spart Bandbreite und Zeit).
*   `--delete`: Löscht Dateien auf dem Zielserver im `build/`-Ordner, die lokal nicht mehr existieren (hält das System sauber und verhindert Konflikte durch veraltete Dateien).

*Hinweis:* Nach einem reinen Frontend-Update (Assets, HTML, JS) ist **kein** Neustart des Python-Backends erforderlich. Das Backend greift direkt auf die neuen Dateien zu. Ein "Hard Reload" (Strg+F5) im Browser reicht, um den lokalen Cache zu leeren.

## 4. Server-Verwaltung (Backend & Nginx)
Für Änderungen am Python-Code des Backends oder Konfigurationen muss man sich per SSH verbinden:
```cmd
ssh thomas@62.83.19.50
```

### Nützliche Befehle (Server-seitig)
*   **Status des Python-Backends prüfen:**
    *(Vorausgesetzt, der Dienst wurde z.B. 'lime-ai' genannt)*
    ```bash
    sudo systemctl status lime-ai
    ```
*   **Backend neu starten (nach Python-Code-Änderungen oder Updates im Backend):**
    ```bash
    sudo systemctl restart lime-ai
    ```
*   **Backend-Logs in Echtzeit einsehen:**
    ```bash
    sudo journalctl -u lime-ai -f
    ```
*   **Nginx-Konfiguration testen & neu laden (nach Anpassungen an der Domain):**
    ```bash
    sudo nginx -t
    sudo systemctl reload nginx
    ```
