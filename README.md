# Ejemplo de Diseño Personalizado para una Aplicación de Zoom

Este ejemplo de aplicación de Zoom utiliza Node.js + Express para demostrar cómo puede usar la API de Capas de Zoom para crear una aplicación de Zoom inmersiva que cautive a su audiencia y presentadores por igual con un diseño personalizado.

## Prerrequisitos

1. [Node JS](https://nodejs.org/en/)
2. [Ngrok](https://ngrok.com/docs/getting-started)
3. [Cuenta de Zoom](https://support.zoom.us/hc/en-us/articles/207278726-Plan-Types-)
4. [Credenciales de la Aplicación de Zoom](#config:-credenciales-de-la-aplicación) (Instrucciones a continuación)
    1. ID de Cliente
    2. Secreto del Cliente
    3. URI de Redirección

## Empezando

Abra su terminal:

```bash
# Clone este repositorio
git clone git@github.com/zoom/zoomapps-customlayout-js

# navegue al directorio del proyecto clonado
cd zoomapps-customlayout-js

# ejecute NPM para instalar las dependencias de la aplicación
npm install

# inicialice su sesión de ngrok
ngrok http 3000
```

### Cree su Aplicación de Zoom

En su navegador web, navegue al [Portal de Desarrolladores de Zoom](https://developers.zoom.us/) y regístrese/inicie sesión en su cuenta de desarrollador.

Haga clic en el botón "Build App" en la parte superior y elija la aplicación "Zoom Apps".

1. Nombre su aplicación
2. Elija si desea listar su aplicación en el marketplace o no
3. Haga clic en "Create"

Para obtener más información, puede seguir [esta guía](https://dev.to/zoom/introducing-zoom-apps-33he) o ver [esta serie de videos](https://www.youtube.com/playlist?list=PLKpRxBfeD1kGN-0QgQ6XtSwtxI3GQM16R) sobre cómo crear y configurar estas aplicaciones de Zoom de ejemplo.

### Config: Credenciales de la Aplicación

En su terminal donde inició `ngrok`, busque el valor de `Forwarding` y cópielo/péguelo en los campos "Home URL" y "Redirect URL for OAuth".

```
Home URL:               https://xxxxx.ngrok.io
Redirect URL for OAuth: https://xxxxx.ngrok.io/auth
```

> NOTA: Las URL de ngrok en el plan gratuito de ngrok son efímeras, lo que significa que solo vivirán un par de horas como máximo y cambiarán cada vez que reinicie la aplicación. Esto requerirá que actualice estos campos cada vez que reinicie su servicio de ngrok.

#### Lista de permisos de OAuth

- `https://example.ngrok.io`

#### Lista de dominios permitidos

- `appssdk.zoom.us`
- `ngrok.io`

### Config: Información

La siguiente información es necesaria para activar su aplicación:

- Información básica
    - Nombre de la aplicación
    - Descripción breve
    - Descripción larga (está bien ingresar un mensaje corto aquí por ahora)
- Información de contacto del desarrollador
    - Nombre
    - Dirección de correo electrónico

> NOTA: si tiene la intención de publicar su aplicación en el Marketplace de Aplicaciones de Zoom, se requerirá más información en esta sección antes de enviarla.

### Config: Características de la Aplicación

En la sección del SDK de la Aplicación de Zoom, haga clic en el botón `+ Add APIs` y habilite las siguientes opciones de sus respectivas secciones:

#### APIs

- clearImage,
- clearParticipant,
- closeRenderingContext
- connect
- rawImage
- drawParticipant
- getMeetingParticipants
- getMeetingUUID
- getRunningContext
- getUserContext
- postMessage
- runRenderingContext
- sendAppInvitationToAllParticipants

#### Eventos

- onConnect
- onMeeting
- onMessage
- onMyMediaChange
- onParticipantChange

### Ámbitos

Asegúrese de que el siguiente ámbito esté seleccionado en la pestaña Ámbitos:
- `zoomapp:inmeeting`

### Config `.env`

Al compilar para Desarrollo, abra el archivo `.env` en su editor de texto e ingrese la siguiente información de la sección Credenciales de la Aplicación que acaba de configurar:

```ini
# ID de Cliente para su Aplicación de Zoom
ZM_CLIENT_ID=[app_client_id]

# Secreto del Cliente para su aplicación de Zoom
ZM_CLIENT_SECRET=[app_client_secret]

# URI de Redirección configurado para su aplicación en el Marketplace de Zoom
ZM_REDIRECT_URL=https://[xxxx-xx-xx-xxx-x].ngrok.io/auth
```

#### Zoom para Gobierno

Si es un cliente de [Zoom para Gobierno (ZfG)](https://www.zoomgov.com/), puede usar la variable `ZM_HOST` para cambiar la URL base utilizada para Zoom. Esto le permitirá ajustarse a las diferentes URL base de Marketplace y API utilizadas por los clientes de ZfG.

**URL del Marketplace:** marketplace.*zoomgov.com*

**URL base de la API:** api.*zoomgov.com*

## Iniciar la Aplicación

### Desarrollo

Ejecute el script npm `dev` para iniciar en modo de desarrollo usando un contenedor de Docker.

```shell
npm run dev
```

El script `dev` hará lo siguiente:

1. Observará los archivos JS y los compilará en la carpeta dist/
2. Observará los archivos del Servidor y los compilará en la carpeta dist/
3. Iniciará la aplicación

### Producción

Cuando se ejecuta la aplicación en producción, no se envían registros a la consola de forma predeterminada y el servidor no se reinicia con los cambios en los archivos.

Usamos la variable de entorno `NODE_ENV` aquí para decirle a la aplicación que se inicie en modo de producción.

```shell
# Mac/Linux
NODE_ENV=production npm start

# Windows
set NODE_ENV=production && npm start
````

## Uso

Para instalar la Aplicación de Zoom, navegue a la **Home URL** que configuró en su navegador y haga clic en el enlace para instalar.

Después de autorizar la aplicación, Zoom abrirá automáticamente la aplicación dentro del cliente.

### Manteniendo los secretos en secreto

Esta aplicación utiliza el ID de Cliente y el Secreto del Cliente de su Aplicación de Zoom, así como un secreto personalizado para firmar las cookies de sesión. Durante el desarrollo, la aplicación leerá del archivo .env.

Para alinearse con las mejores prácticas de seguridad, esta aplicación no lee del archivo .env en modo de producción.

Esto significa que querrá establecer variables de entorno en la plataforma de alojamiento que está utilizando en lugar de dentro del archivo .env. Esto podría incluir el uso de un administrador de secretos o una canalización de CI/CD.

> :warning: **Nunca confirme su archivo .env en el control de versiones:** Es probable que el archivo contenga las Credenciales de la Aplicación de Zoom y los Secretos de la Sesión.

### Estilo de Código

Este proyecto utiliza [prettier](https://prettier.io/) y [eslint](https://eslint.org/) para hacer cumplir el estilo y proteger contra errores de codificación junto con un gancho de pre-confirmación de git a través de [husky](https://typicode.github.io/husky/#/) para garantizar que los archivos pasen las verificaciones antes de la confirmación.

### Pruebas

En este momento no hay pruebas e2e o unitarias.

## ¿Necesita ayuda?

Si está buscando ayuda, pruebe el [Soporte para Desarrolladores](https://devsupport.zoom.us) o nuestro [Foro de Desarrolladores](https://devforum.zoom.us). El soporte prioritario también está disponible con los planes de [Soporte para Desarrolladores Premier](https://zoom.us/docs/en-us/developer-support-plans.html).

### Documentación
Asegúrese de revisar [nuestra documentación](https://marketplace.zoom.us/docs/zoom-apps/introduction/) como referencia al crear sus Aplicaciones de Zoom.