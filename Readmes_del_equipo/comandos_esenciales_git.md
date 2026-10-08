# Guía de Estudio: Comandos Esenciales de Git y Terminal

Si vas a asumir el rol de Arquitecto, no puedes depender de que alguien más te resuelva los conflictos de Git. Tienes que entender qué hace la herramienta por debajo. Lee esto, estúdialo, y pregúntate por qué cada comando existe.

---

## 1. Gestión y Creación de Ramas

`git checkout -b <nombre-rama>`
- **Qué hace:** Crea una rama local nueva tomando como base exacta el código en el que estás parado en ese momento, y te mueve automáticamente a ella.
- **Cuándo usarlo:** Cuando vas a empezar un Sprint nuevo (ej. `sP3`) o una Historia de Usuario aislada. No trabajes directo en `dev` o `main`.

`git push -u origin <nombre-rama>`
- **Qué hace:** Sube tu rama recién creada al servidor remoto (GitHub) y establece un vínculo (`-u` o `--set-upstream`). 
- **Por qué importa:** Sin el `-u`, la próxima vez que hagas un simple `git pull` o `git push`, Git no sabrá a qué rama de internet conectarse y lanzará un error.

`git checkout <nombre-rama>`
- **Qué hace:** Te cambia de una rama a otra. 
- **Cuidado:** Si tienes archivos modificados sin guardar (sin commit), Git no te dejará cambiar de rama si esos cambios chocan con los archivos de la rama destino.

---

## 2. Sincronización (Traer y Llevar Código)

`git pull origin <nombre-rama>`
- **Qué hace:** Va a GitHub, descarga los últimos *commits* de tus compañeros y los intenta fusionar (mezclar) automáticamente con tu código local.
- **Punto ciego:** Muchos hacen `git push` primero y falla. *Siempre* debes descargar (pull) antes de subir (push). Si tus compañeros subieron algo, tienes que integrarlo a tu máquina primero.

`git push origin <nombre-rama>`
- **Qué hace:** Envía tus *commits* locales empaquetados hacia GitHub. Solo funciona si no hay código nuevo en el servidor que tú no hayas descargado previamente.

---

## 3. Resolución de Desastres y Conflictos

A lo largo del proyecto, arruinaste el historial reescribiendo ramas viejas. Esto genera los "Merge Conflicts" (Conflictos de mezcla). Así los atacamos:

`git merge --abort`
- **Qué hace:** Si corriste un `git pull` o `git merge` y la consola se llenó de letras rojas y conflictos, este comando aborta la operación y te regresa al estado seguro antes de intentar mezclar. Es tu botón de pánico.

`git merge -X theirs <nombre-rama>`
- **Qué hace:** Es una mezcla forzada con una estrategia agresiva (`-X theirs`). Le dice a Git: *"Si hay un conflicto entre mi código actual y el código de la rama que estoy trayendo, dale siempre la razón a la rama que estoy trayendo"*.
- **Por qué es peligroso:** Si lo usas sin pensar, puedes sobreescribir y borrar el código valioso que tú tenías. Solo lo usamos porque sabíamos que la nueva arquitectura en `sP2` era la correcta y queríamos aplastar el código viejo de `dev`.

`git restore <archivo>`
- **Qué hace:** Descarta cualquier modificación local (no guardada en commit) de un archivo específico y lo regresa a como estaba en la base de datos de Git.
- **Ejemplo real:** Cuando `npm install` te modificó el `package-lock.json` y no te dejaba descargar código, usamos `git restore` para destruir ese cambio local y liberar el candado.

`git rm <archivo>`
- **Qué hace:** Elimina un archivo de tu computadora y también lo marca como "Eliminado" en el registro de Git. Se usa mucho para resolver conflictos tipo "modify/delete" (alguien modificó un archivo, pero otra persona lo borró).

---

## 4. Comandos de Node / NPM

`npm install`
- **Qué hace:** Lee el archivo `package.json` y va a internet a descargar miles de carpetas y dependencias necesarias para que el código de React/Next.js funcione.
- **Punto crítico:** Las librerías descargadas van a parar a `node_modules`. Esa carpeta **jamás** se sube a Git. Si un compañero baja tu proyecto, no tendrá esa carpeta, tendrá que correr `npm install` él mismo en su máquina para generar la suya.

---

## 5. Auditoría e Historial (Quién hizo qué)

`git log --pretty=format:"%C(yellow)%h%Creset - %an, %C(green)%ar%Creset : %s"`
- **Qué hace:** Muestra un historial limpio y coloreado. Te indica el ID del commit, el nombre del autor, hace cuánto tiempo se hizo y el mensaje exacto.
- **Punto ciego:** El nombre que muestra no es el usuario de GitHub, sino el nombre local configurado en la computadora de quien hizo el commit.

`git log --graph --pretty=format:"%C(yellow)%h%Creset -%C(auto)%d%Creset %s %C(green)(%cr) %C(bold blue)<%an>%Creset"`
- **Qué hace:** Dibuja un "árbol" visual en la terminal.
- **Cuándo usarlo:** Cuando quieres entender gráficamente cómo se bifurcó una rama y dónde se mezcló de vuelta con `main` o `dev`.

`git shortlog -sn --all`
- **Qué hace:** Genera una tabla de posiciones resumiendo cuántos commits ha hecho cada persona en el proyecto.
